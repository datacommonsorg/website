# Helm Charts

The DC website can be installed using [helm](https://helm.sh/)

# How to install the DC website on a live GKE cluster.

You will need the following ready.

- A live GKE cluster
- Kubeconfig set to the correct context
- [A global static IP reserved](https://cloud.google.com/compute/docs/ip-addresses/reserve-static-external-ip-address).
- Domain from your choice of DNS provider, and have the a [DNS type A record](https://en.wikipedia.org/wiki/List_of_DNS_record_types) which points from the domain to the IP from above.

Please refer to the [NOTES.txt](dc_website_v1/templates/NOTES.txt) on the installation process.

Note: DNS record takes up to 72 hours to propagate. While the helm chart
can still be installed before it is completed, the load balancer that is created by the chart may not be ready until then.