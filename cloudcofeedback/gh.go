package main

import (
	"fmt"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/google/go-github/github"
	"github.com/joho/godotenv"
	"golang.org/x/oauth2"
)

var (
	gclient *github.Client
	org     string = "IBM-Bluemix"
	repo    string = "insurance-bot"
)

func init() {
	err := godotenv.Load()
	if err != nil {
		fmt.Println(".env file does not exist")
	}

	ts := oauth2.StaticTokenSource(
		&oauth2.Token{AccessToken: os.Getenv("GITHUB_TOKEN")},
	)
	tc := oauth2.NewClient(oauth2.NoContext, ts)
	gclient = github.NewClient(tc)
}

func sendIssue(issue *github.IssueRequest) error {
	_, _, err := gclient.Issues.Create(org, repo, issue)
	return err
}

func handleIndex(c *gin.Context) {
	c.String(200, "Nothing to see here")
}

func handleFeedback(c *gin.Context) {
	labels := []string{"feedback", "from_ide"}
	issue := &github.IssueRequest{
		Labels: &labels,
	}
	if c.BindJSON(&issue) == nil {
		err := sendIssue(issue)
		if err != nil {
			fmt.Println(err)
			c.String(400, "Unable to create feedback")
			return
		} else {
			c.String(200, "Thanks For the Feedback")
		}
	} else {
		c.String(400, "Invalid JSON body")
	}
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	router := gin.Default()

	//fix for gin not serving HEAD
	router.HEAD("/", func(c *gin.Context) {
		c.String(200, "pong")
	})

	router.GET("/", handleIndex)
	router.POST("/api/feedback", handleFeedback)

	router.Run(":" + port)
}
