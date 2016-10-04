[![Build Status](https://travis-ci.org/IBM-Bluemix/insurance-bot.svg?branch=master)](https://travis-ci.org/IBM-Bluemix/insurance-bot)

# Insurance Policy Bot Overview

[![Policy Bot](./design/video-cap.png)](https://vimeo.com/165460548 "Policy Bot Concept - Click to Watch!")

Insurance Policy Bot is a collection of experimental Watson & Bluemix concepts applied to the insurance domain.


## Note:
Login is in progress,


## Running the app on Bluemix
<Either add a Deploy to Bluemix button or include detailed instructions on how to deploy the app(s) to Bluemix after cloning the repo. You should assume the user has little to no Bluemix experience and provide as much detail as possible in the steps.>

Coming Soon!

[Sign up for Bluemix](https://console.ng.bluemix.net/registration) in the meantime!

<Create sub-sections to break down larger sequences of steps. General rule of thumb is that you should not have more than 9 steps in each task. Include sanity checks, or ways for the developer to confirm what they have done so far is correct, every 20 steps. Also, avoid directly referencing the Bluemix UI components so that ACE changes don't invalidate your README.>

## Run the app locally

1. Create a Compose for MongoDB service in Bluemix

1. Create a Conversation service in Bluemix

1. In the checkout directory, copy the file ```vcap-local.template.json``` to ```vcap-local.json```. Edit ```vcap-local.json``` and update the credentials for the MongoDB and Conversation services.

  ```
  cp vcap-local.template.json vcap-local.json
  ```

1. In the checkout directory, copy the file ```.template.env``` to ```.env```. Edit ```.env``` and update the credentials for the MongoDB and Conversation services.

  ```
  cp .template.env .env
  ```

1. Run

  ```
  npm install
  ```

1. Run

  ```
  npm start
  ```

## API documentation
The API methods that this component exposes requires the discovery of dependent services, however, the API will gracefully fail when they are not available.

The API and data models are defined in ...

## Contribute
Please check out our [Contributing Guidelines]()for detailed information on how you can lend a hand.

## Troubleshooting

The primary source of debugging information for your Bluemix app is the logs. To see them, run the following command using the Cloud Foundry CLI:

  ```
  $ cf logs cloudco --recent
  ```
For more detailed information on troubleshooting your application, see the [Troubleshooting section](https://www.ng.bluemix.net/docs/troubleshoot/tr.html) in the Bluemix documentation.



## License

See [License.txt](License.txt) for license information.
