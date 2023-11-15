const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");

const config = new pulumi.Config();

// Import variables.
const project = config.require("project");
const vpcCidrBlock = config.require("vpcCidrBlock");
const maxAllowedAzs = config.require("maxAllowedAzs");
const myIp = config.require("myIp");
const serverPort = config.require("serverPort");

const ec2KeyPair = config.require("ec2Keypair");
const ec2InstanceType = config.require("ec2InstanceType");

const ebsVolumeSize = config.require("ebsVolumeSize");
const ebsVolumeType = config.require("ebsVolumeType");

const rdsDB = config.require("rdsDB");
const rdsUser = config.require("rdsUser");
const rdsPassword = config.require("rdsPassword");

const appUser = config.require("appUser");
const appPassword = config.require("appPassword");
const appGroup = config.require("appGroup");

const hostedZoneDNS = config.require("hostedZone");

var azs = [];

/**
 * Generate dynamic tags for resources.
 * @param {string} resourceName - Name of resource.
 * @param {string[]} additionalTags - Additional tags.
 * @returns {object} - An object of tags.
 */
const generateTags = (resourceName, additionalTags = []) => {
  const baseTags = {
    Name: `${project}-${pulumi.getStack()}-${resourceName}`,
  };
  const tags = { ...baseTags, ...additionalTags };
  return tags;
};

const loadAvailabilityZones = async () => {
  try {
    const zones = await aws.getAvailabilityZones({
      state: "available",
    });
    azs = zones.names.slice(0, Math.min(zones.names.length, maxAllowedAzs));
  } catch (error) {
    console.error(error);
  }
};

const getAmi = async () => {
  try {
    const ami = await aws.ec2.getAmi({
      owners: ["253323498692"],
      mostRecent: true,
      filters: [
        {
          name: "name",
          values: ["webapp-ami-*"],
        },
        {
          name: "state",
          values: ["available"],
        },
      ],
    });
    return ami;
  } catch (error) {
    console.error(error);
  }
};

const main = async () => {
  //Load AZs for a given region
  await loadAvailabilityZones();
  const ami = await getAmi();

  // Create a new VPC.
  const myVpc = new aws.ec2.Vpc(generateTags("vpc").Name, {
    cidrBlock: vpcCidrBlock,
    defaultRouteTableAssociation: false,
    tags: generateTags("vpc"),
  });

  // Create an Internet Gateway and attach it to the VPC.
  const myInternetGateway = new aws.ec2.InternetGateway(
    generateTags("ig").Name,
    {
      vpcId: myVpc.id,
      tags: generateTags("ig"),
    },
  );

  // Create a public subnets in given availability zone.
  const publicSubnets = azs.map((az, index) => {
    return new aws.ec2.Subnet(generateTags(`pub-sn-${index}`).Name, {
      vpcId: myVpc.id,
      availabilityZone: az,
      cidrBlock: `10.0.${index}.0/24`,
      tags: generateTags(`pub-sn-${index}`),
    });
  });

  // Create a private subnets in given availability zone.
  const privateSubnets = azs.map((az, index) => {
    return new aws.ec2.Subnet(generateTags(`pvt-sn-${index}`).Name, {
      vpcId: myVpc.id,
      availabilityZone: az,
      cidrBlock: `10.0.${index + azs.length}.0/24`,
      tags: generateTags(`pvt-sn-${index}`),
    });
  });

  // Create a public route table and associate it with public subnets.
  const publicRouteTable = new aws.ec2.RouteTable(
    generateTags("pub-rtable").Name,
    {
      vpcId: myVpc.id,
      routes: [
        {
          cidrBlock: "0.0.0.0/0",
          gatewayId: myInternetGateway.id,
        },
      ],
      tags: generateTags("pub-rtable"),
    },
  );

  publicSubnets.forEach((subnetId, index) => {
    const subnetRouteTableAssociation = new aws.ec2.RouteTableAssociation(
      `pubRouteTableAssoc-${index}`,
      {
        subnetId: subnetId,
        routeTableId: publicRouteTable.id,
      },
    );
  });

  // Create a private route table and associate it with private subnets.
  const privateRouteTable = new aws.ec2.RouteTable(
    generateTags("pvt-rtable").Name,
    {
      vpcId: myVpc.id,
      tags: generateTags("pvt-rtable"),
    },
  );

  privateSubnets.forEach((subnetId, index) => {
    const subnetRouteTableAssociation = new aws.ec2.RouteTableAssociation(
      `pvtRouteTableAssoc-${index}`,
      {
        subnetId: subnetId,
        routeTableId: privateRouteTable.id,
      },
    );
  });

  const routeTableAssociation = new aws.ec2.RouteTableAssociation(
    "routeTableAssociation",
    {
      gatewayId: myInternetGateway.id,
      routeTableId: privateRouteTable.id,
    },
  );

  const elbSecurityGroup = new aws.ec2.SecurityGroup(
    generateTags("elb-sg").Name,
    {
      name: generateTags("elb-sg").Name,
      description: "Allow incoming SSH and TCP",
      vpcId: myVpc.id,
      ingress: [
        {
          protocol: "tcp",
          fromPort: 80,
          toPort: 80,
          cidrBlocks: ["0.0.0.0/0"],
        },
        {
          protocol: "tcp",
          fromPort: 443,
          toPort: 443,
          cidrBlocks: ["0.0.0.0/0"],
        },
      ],
    },
  );

  const ec2SecurityGroup = new aws.ec2.SecurityGroup(
    generateTags("ec2-sg").Name,
    {
      name: generateTags("ec2-sg").Name,
      description: "Allow incoming SSH and TCP",
      vpcId: myVpc.id,
      ingress: [
        {
          protocol: "tcp",
          fromPort: 22,
          toPort: 22,
          cidrBlocks: [myIp],
        },
        {
          protocol: "tcp",
          fromPort: serverPort,
          toPort: serverPort,
          securityGroups: [elbSecurityGroup.id],
        },
      ],
    },
  );

  const allowOutboundToEC2Rule = new aws.ec2.SecurityGroupRule(
    "AllowOutboundToEC2",
    {
      type: "egress",
      fromPort: serverPort,
      toPort: serverPort,
      protocol: "tcp",
      sourceSecurityGroupId: ec2SecurityGroup.id,
      securityGroupId: elbSecurityGroup.id,
    },
  );

  const dbSecurityGroup = new aws.ec2.SecurityGroup(
    generateTags("db-sg").Name,
    {
      name: generateTags("db-sg").Name,
      description:
        "Allow access to the PostgreSQL database from the Web Server",
      dependsOn: [ec2SecurityGroup],
      vpcId: myVpc.id,
      ingress: [
        {
          protocol: "tcp",
          fromPort: 5432,
          toPort: 5432,
          securityGroups: [ec2SecurityGroup.id],
        },
      ],
    },
  );

  const allowOutboundToDBRule = new aws.ec2.SecurityGroupRule(
    "AllowOutboundToDB",
    {
      type: "egress",
      fromPort: 5432,
      toPort: 5432,
      protocol: "tcp",
      sourceSecurityGroupId: dbSecurityGroup.id,
      securityGroupId: ec2SecurityGroup.id,
    },
  );

  const allowOutboundToCloudwatchRule = new aws.ec2.SecurityGroupRule(
    "AllowOutboundToCloudwatch",
    {
      type: "egress",
      fromPort: 443,
      toPort: 443,
      protocol: "tcp",
      cidrBlocks: ["0.0.0.0/0"],
      securityGroupId: ec2SecurityGroup.id,
    },
  );

  const allowOutboundToStatsdhRule = new aws.ec2.SecurityGroupRule(
    "AllowOutboundToStatsd",
    {
      type: "egress",
      fromPort: 8125,
      toPort: 8125,
      protocol: "udp",
      cidrBlocks: ["0.0.0.0/0"],
      securityGroupId: ec2SecurityGroup.id,
    },
  );

  const dbSubnetGroup = new aws.rds.SubnetGroup(
    generateTags("db-pvt-sng").Name,
    {
      description: "Subnet group for the RDS instance",
      subnetIds: [privateSubnets[0].id, privateSubnets[1].id],
      name: generateTags("db-pvt-sng").Name,
    },
  );

  const dbParameterGroup = new aws.rds.ParameterGroup(
    generateTags("db-pg").Name,
    {
      name: generateTags("db-pg").Name,
      family: "postgres15",
    },
  );

  const dbInstance = new aws.rds.Instance(generateTags("db").Name, {
    identifier: generateTags("db").Name,
    dbName: rdsDB,
    allocatedStorage: 20,
    instanceClass: "db.t3.micro",
    parameterGroupName: dbParameterGroup.name,
    engine: "postgres",
    username: rdsUser,
    password: rdsPassword,
    dbSubnetGroupName: dbSubnetGroup.name,
    publiclyAccessible: false,
    multiAz: false,
    availabilityZone: "us-east-1a",
    vpcSecurityGroupIds: [dbSecurityGroup.id],
    skipFinalSnapshot: true,
    deleteAutomatedBackups: true,
    deletionProtection: false,
    tags: generateTags("db"),
  });

  const ec2Role = new aws.iam.Role("WebappEC2Role", {
    name: "WebappEC2Role",
    assumeRolePolicy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Action: "sts:AssumeRole",
          Effect: "Allow",
          Principal: {
            Service: "ec2.amazonaws.com",
          },
        },
      ],
    }),
  });

  const cloudWatchPolicy = new aws.iam.PolicyAttachment(
    "CloudWatchAgentPolicyAttachment",
    {
      policyArn: "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy",
      roles: [ec2Role.name],
    },
  );

  const instanceProfile = new aws.iam.InstanceProfile("WebappInstanceProfile", {
    name: "MyInstanceProfile",
    role: ec2Role.name,
  });

  const userdata = pulumi.all([
    dbInstance.endpoint,
  ]).apply(([endpoint]) => {
    return `#!/bin/bash
# Set your app-specific values
RDS_ENDPOINT=${endpoint}
RDS_DB=${rdsDB}
RDS_USER=${rdsUser}
RDS_PASSWORD=${rdsPassword}
SERVER_PORT=${serverPort}
APP_USER=${appUser}
APP_USER_PASSWORD=${appPassword}
APP_GROUP=${appGroup}
APP_DIR="/var/www/webapp"
ENV_DIR="/opt/.env.prod"

# Change ENV owner and permissions
sudo touch $ENV_DIR
sudo chown $APP_USER:$APP_GROUP $ENV_DIR
sudo chmod 660 $ENV_DIR

# Add ENV variables
sudo echo SERVER_PORT=$SERVER_PORT >> $ENV_DIR
sudo echo POSTGRES_DB=$RDS_DB >> $ENV_DIR
sudo echo POSTGRES_USER=$RDS_USER >> $ENV_DIR
sudo echo POSTGRES_PASSWORD=$RDS_PASSWORD >> $ENV_DIR
sudo echo POSTGRES_URI=$(echo $RDS_ENDPOINT | cut -d':' -f 1) >> $ENV_DIR
sudo echo FILEPATH=$APP_DIR/deployment/user.csv >> $ENV_DIR

# Start cloudwatch service
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/bin/config.json -s

# Restart systemd service
sudo systemctl restart webapp.service
    `;
  });

  // Define your launch template
  const launchTemplate = new aws.ec2.LaunchTemplate("launch-template", {
    name: generateTags("lt").Name,
    instanceType: ec2InstanceType,
    imageId: ami.id,
    iamInstanceProfile: {
      name: instanceProfile.name
    },
    keyName: ec2KeyPair,
    subnetId: publicSubnets[0].id,
    disableApiTermination: false,
    vpcSecurityGroupIds: [ec2SecurityGroup.id],
    associatePublicIpAddress: true,
    userData: pulumi.interpolate`${userdata.apply(script => Buffer.from(script).toString('base64'))}`,
    rootBlockDevice: {
      volumeSize: ebsVolumeSize,
      volumeType: ebsVolumeType,
      deleteOnTermination: true,
    },
  });

  // Create an Application Load Balancer
  const alb = new aws.lb.LoadBalancer(generateTags("alb").Name, {
    loadBalancerType: "application",
    securityGroups: [elbSecurityGroup.id],
    subnets: publicSubnets.map(subnet => (subnet.id)),
    enableDeletionProtection: false,
    tags: generateTags("alb")
  });

  // Define a target group
  const targetGroup = new aws.lb.TargetGroup("tg", {
    port: serverPort,
    protocol: "HTTP",
    vpcId: myVpc.id,
    targetType: "instance",
    healthCheck: {
      enabled: true,
      interval: 30,
      path: "/test",
      protocol: "HTTP",
      port: serverPort,
      matcher: "200",
      timeout: 10,
      unhealthyThreshold: 3,
    },
  });

  // Create a listener for the Application Load Balancer to route traffic
  const listener = new aws.lb.Listener("listener", {
    loadBalancerArn: alb.arn,
    port: 80,
    defaultActions: [{
        type: "forward",
        targetGroupArn: targetGroup.arn,
    }],
  });

  // Create an Auto Scaling Group
  const autoScalingGroup = new aws.autoscaling.Group("asg", {
    maxSize: 3,
    minSize: 1,
    desiredCapacity: 1,
    vpcZoneIdentifiers: [publicSubnets[0].id, publicSubnets[1].id],
    launchTemplate: {
        id: launchTemplate.id,
        version: "$Latest", // or specify a specific version
    },
    targetGroupArns: [targetGroup.arn],
    cooldown: 60,
    tags: [{
      key: "Name", 
      value: generateTags("ec2").Name,
      propagateAtLaunch: true,
    }],
  });

  // Register the target group with the Auto Scaling Group
  const attachment = new aws.autoscaling.Attachment("asg-attachment", {
    lbTargetGroupArn: targetGroup.arn,
    autoscalingGroupName: autoScalingGroup.name,
  });

  const hostedZone = aws.route53.getZone({
    name: hostedZoneDNS,
  });

  const aRecord = new aws.route53.Record("dns-alias", {
    zoneId: hostedZone.then(zone => zone.id),
    name: hostedZoneDNS,
    type: "A",
    aliases: [{
      evaluateTargetHealth: true,
      name: alb.dnsName,
      zoneId: alb.zoneId,
    }],
  });

  // Create Step Scaling Policy for scaling in
  const scaleDownPolicy = new aws.autoscaling.Policy('scaledown-policy', {
    adjustmentType: 'ChangeInCapacity',
    cooldown: 60,
    autoscalingGroupName: autoScalingGroup.name,
    scalingAdjustment: -1,
  });

  // Create Step Scaling Policy for scaling in
  const scaleUpPolicy = new aws.autoscaling.Policy('scaleup-policy', {
    adjustmentType: 'ChangeInCapacity',
    cooldown: 60,
    autoscalingGroupName: autoScalingGroup.name,
    scalingAdjustment: 1,
  });

  const scaleDownAlarm = new aws.cloudwatch.MetricAlarm('scaledown-alarm', {
    alarmDescription: 'Scale down when CPU utilization is below 3%',
    alarmName: 'ScaleDownAlarm',
    comparisonOperator: 'LessThanOrEqualToThreshold',
    evaluationPeriods: 1,
    metricName: 'CPUUtilization',
    namespace: 'AWS/EC2',
    period: 60,
    statistic: 'Average',
    threshold: 3,
    alarmActions: [scaleDownPolicy.arn],
    dimensions: {
      AutoScalingGroupName: autoScalingGroup.name,
    },
  });

  const scaleUpAlarm = new aws.cloudwatch.MetricAlarm('scaleup-alarm', {
    alarmDescription: 'Scale up when CPU utilization is below 3%',
    alarmName: 'ScaleUpAlarm',
    comparisonOperator: 'GreaterThanOrEqualToThreshold',
    evaluationPeriods: 1,
    metricName: 'CPUUtilization',
    namespace: 'AWS/EC2',
    period: 60,
    statistic: 'Average',
    threshold: 5,
    alarmActions: [scaleUpPolicy.arn],
    dimensions: {
      AutoScalingGroupName: autoScalingGroup.name,
    },
  });

  // Export the VPC ID and other resources if needed.
  return {
    vpcId: myVpc.id,
    internetGatewayId: myInternetGateway.id,
    publicSubnetIds: publicSubnets.map((subnet) => subnet.id),
    privateSubnetIds: privateSubnets.map((subnet) => subnet.id),
    dbEndpoint: dbInstance.endpoint,
  };
};

const outputs = main();
exports.vpc = outputs.then((obj) => obj.vpcId);
exports.internetGateway = outputs.then((obj) => obj.internetGatewayId);
exports.publicSubnets = outputs.then((obj) => obj.publicSubnetIds);
exports.privateSubnets = outputs.then((obj) => obj.privateSubnetIds);
exports.dbEndpoint = outputs.then((obj) => obj.dbEndpoint);
