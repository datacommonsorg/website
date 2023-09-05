#!/bin/bash

cbt -project datcom-store -instance website-data read nl-query start="$1" end="$1"z
