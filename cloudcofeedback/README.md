#Feedback and update service for CloudCo
Allowing github to create issues when feedback is added.  
To get this done you a form in which can handle the posts the request and a [personal access token](https://github.com/settings/tokens), with that in place you can push the application below to Bluemix and use the url to the one in which you created. In the example below we have: https://cloudcofeedback.mybluemix.net/api/feedback.  
The cloudcofeedback is the empty application that you deployed to Bluemix.


##Deploy to Bluemix
- Download and cd to the cloudcofeedback folder
- create a file `.env` in which will hold the token and release label
- set the content to the following

    ```
    GITHUB_TOKEN=xxxx
    LATEST_RELEASE=xyz
    ```
- replace xxxx with your github token  
- replace xyz with a commit id  
- Done!
