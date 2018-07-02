# Cloud Insurance Co. - Main web site and chat bot

| **master** | [![Build Status](https://travis-ci.org/IBM-Cloud/insurance-bot.svg?branch=master)](https://travis-ci.org/IBM-Cloud/insurance-bot) |
| ----- | ----- |
| **dev** | [![Build Status](https://travis-ci.org/IBM-Cloud/insurance-bot.svg?branch=dev)](https://travis-ci.org/IBM-Cloud/insurance-bot) |

This repository is part of the larger [Cloud Insurance Co.](https://github.com/IBM-Cloud/cloudco-insurance) project.

# Overview

[![Policy Bot](./design/video-cap.png)](https://vimeo.com/165460548 "Policy Bot Concept - Click to Watch!")

# Deploy
In order to deploy the full set of microservices involved, check out the [insurance-toolchain repo][toolchain_url]. Otherwise, you can deploy just the app by following the steps here.

## Running the app on IBM Cloud

1. If you do not already have a IBM Cloud account, [sign up here][bluemix_reg_url]

2. Download and install the [IBM Cloud CLI][ibmcloud_cli_url] tool

3. Clone the app to your local environment from your terminal using the following command:

  ```
  git clone https://github.com/IBM-Cloud/insurance-bot.git
  ```

4. `cd` into this newly created directory

5. Open the `manifest.yml` file and change the `host` value to something unique.

  The host you choose will determinate the subdomain of your application's URL:  `<host>.mybluemix.net`

6. Connect to IBM Cloud in the command line tool and follow the prompts to log in. Download and setup [IBM Cloud CLI](https://console.bluemix.net/docs/cli/reference/bluemix_cli/get_started.html#getting-started)

    ```
    ibmcloud login
    ```
    Use `ibmcloud target --cf` to set org and space; Run `ibmcloud regions` to find API endpoints.

7. Create a Cloudant service in IBM Cloud

    ```
    ibmcloud cf create-service cloudantNoSQLDB Lite insurance-bot-db
    ```

8. Create a Conversation service in IBM Cloud

    ```
    ibmcloud cf create-service conversation free insurance-bot-conversation
    ```

9. Push the app to IBM Cloud

    ```
    ibmcloud cf push
    ```

And voila! You now have your very own instance of the app running on IBM Cloud.

## Run the app locally

1. If you do not already have a IBM Cloud account, [sign up here][bluemix_reg_url]

2. If you have not already, [download Node.js][download_node_url] and install it on your local machine.

3. Create a Cloudant service in IBM Cloud

    ```
    ibmcloud cf create-service cloudantNoSQLDB Lite insurance-bot-db
    ```

4. Create a Conversation service in IBM Cloud

    ```
    ibmcloud cf create-service conversation free insurance-bot-conversation
    ```

5. In the checkout directory, copy the file ```vcap-local.template.json``` to ```vcap-local.json```. Edit ```vcap-local.json``` and update the credentials for the Cloudant and Conversation services. You can retrieve the service credentials from the IBM Cloud console.

    ```
    cp vcap-local.template.json vcap-local.json
    ```

6. Install the dependencies

    ```
    npm install
    ```

7. Run the app locally

    ```
    npm start
    ```
## Improvements

For continuous improvements, refer to the [additional improvement](https://github.com/IBM-Cloud/insurance-bot-dashboard#additional-improvement) section.

## Cleanup
See the [**Cleanup** section in the toolchain repository](https://github.com/IBM-Cloud/insurance-toolchain#cleanup) for instructions on how to remove the resources associated with the entire project.

## Contribute

If you find a bug, please report it via the [Issues section][issues_url] or even better, fork the project and submit a pull request with your fix! We are more than happy to accept external contributions to this project if they address something noted in an existing issue.  In order to be considered, pull requests must pass the initial [Travis CI][travis_url] build and/or add substantial value to the sample application.

## Troubleshooting

The primary source of debugging information for your IBM Cloud app is the logs. To see them, run the following command using the Cloud Foundry CLI:

  ```
  $ cf logs insurance-bot --recent
  ```

For more detailed information on troubleshooting your application, see the [Troubleshooting section](https://console.bluemix.net/docs/get-support/ts_overview.html#ts-overview) in the IBM Cloud documentation.

## License

See [License.txt](License.txt) for license information.

[toolchain_url]: https://github.com/IBM-Cloud/insurance-toolchain
[bluemix_reg_url]: http://ibm.biz/insurance-store-registration
[ibmcloud_cli_url]: https://console.bluemix.net/docs/cli/reference/bluemix_cli/get_started.html#getting-started
[download_node_url]: https://nodejs.org/download/
[issues_url]: https://github.com/IBM-Cloud/insurance-bot/issues
[travis_url]: https://travis-ci.org/
