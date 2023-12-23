# Application Setup

## DNS configuration using Namecheap and Route53
Amazon Route 53 is a scalable and highly available Domain Name System (DNS) web service provided by AWS. It allows you to register and manage domain names and perform DNS routing for your applications.

To host our application using [Namecheap](https://www.namecheap.com) and AWS Route53, you need to buy a domain of your choice. Namecheap gives a free .me domain along with 1 SSL certificate for 1 year after signing up with a Github Student Developer Pack. You can also buy a different domain, namecheap has good options.

After you have bought the domain
- Create a hosted zone with the domain `yourdomain` in Route53
- Go to DNS management in namecheap and paste all the name server (NS) records from Route53
- Create another hosted zone with `dev.yourdomain`
- Add the NS records from previous step to `yourdomain` (this will route all applciation requests to the subdomain)

> [!TIP]
> DNS propagation takes a while, you should be able to see the NS records using `dig domain.me ns` command

## Setting up Email service with Mailgun
For sending emails, we use a third party service. It is not mandatory to use mailgun. You can also uses AWS SES Sandbox to deliver emails. In this example, we're going to setup mailgun. Their free tier is limited, additional info is available on their [webpage](https://www.mailgun.com/pricing/). Follow these steps to setup mailgun API.
- Sign up for [Mailgun](https://www.mailgun.com) and configure the domain from which emails should be sent
- Copy the DKIM, SPF, MX, and CNAME records and add it to the hosted zone
- Verify on mailgun if the DNS is successfully configured

| Record Name | Type    | Value    |
| :---   | :--- | :--- |
| sudarshankudli.me | MX   | 10 mxa.mailgun.org <br> 10 mxb.mailgun.org  |
| email.sudarshankudli.me | CNAME   | mailgun.org   |
| sudarshankudli.me | TXT   | "v=spf1 include:mailgun.org ~all"   |
| dkim-key.sudarshankudli.me | TXT   | "k=rsa; p=MFSK..."   |

## Getting SSL certificate from ZeroSSL
SSL (Secure Sockets Layer) certificates are digital certificates that provide a secure, encrypted connection between a user's web browser and a web server. They play a fundamental role in securing the transmission of sensitive data over the internet. SSL certificates are now more commonly referred to as TLS (Transport Layer Security) certificates, as TLS is the successor to SSL.

### Option 1 - ZeroSSL
In this project, we're requesting an SSL certificate from [ZeroSSL](https://zerossl.com), they have various plans including a free trial for 3 months. Follow the steps to generate and download the certificate!
    - Create an account with ZeroSSL
    - Head over to dashboard and select `New Certificate`
    - Follow the steps to create and add CNAME record to the hosted zone in Route53
    - Download the certificate files and upload to Amazon Certificate Manager (ACM) using the command

```bash
aws acm import-certificate \
  --certificate fileb://ssl\certificate.crt \
  --private-key fileb://ssl\private.key \
  --certificate-chain fileb://ssl\ca_bundle.crt \
  --region us-east-1 \
  --profile demo
```

### Option 2 - AWS Certificate Manager
Another approach is to use ACM. Head over to AWS and generate a new certificate. here there is no need to import since AWS creates one for us. I followed [this](https://medium.com/@sonynwoye/creating-ssl-certificates-using-aws-certificate-manager-acm-1c359e70ce4d) blog by [Sunday Nwoye](https://medium.com/@sonynwoye) for more detailed steps.

> [!NOTE]
> It takes a while for the status to change from `pending validation` to `success` after the CNAME is added to your domain