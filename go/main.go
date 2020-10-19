// Copyright 2019 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gin-contrib/multitemplate"
	"github.com/gin-gonic/gin"
)

type templateArgs struct {
	MainID           string
	Title            string
	SubPageTitle     string
	GA               string
	IsHideFullFooter bool
	HideSearch       bool
}

var urlMap = URLMap{
	Home:       "/",
	Place:      "/place",
	Browser:    "/browser",
	Timeline:   "/tools/timeline",
	About:      "/about",
	Dataset:    "/dataset",
	Faq:        "/faq",
	Feedback:   "/feedback",
	Search:     "/search",
	Disclaimer: "/disclaimer",
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = ":7070"
	}
	log.Printf("Listening on port %s", port)

	r := gin.Default()

	r.Static("/static", "./dist")

	// Load template HTML files.
	r.LoadHTMLGlob("template/*/*")

	tmpl := multitemplate.New()
	tmpl.AddFromFiles("dev", "template/base.html", "template/dev/dev.html")
	r.HTMLRender = tmpl

	r.GET("/dev", func(ctx *gin.Context) {
		if os.Getenv("FLASK_ENV") == "production" {
			ctx.JSON(404, gin.H{"message": "Page not found"})
		} else {
			ctx.HTML(http.StatusOK, "dev", gin.H{
				"data": templateArgs{
					MainID:           "dev",
					Title:            "Dev page",
					SubPageTitle:     "sub page title",
					IsHideFullFooter: false,
					HideSearch:       false,
				},
				"urlMap": urlMap,
			})
		}
	})

	r.Run(port)
}
