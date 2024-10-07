#!/bin/bash

json-server -H 0.0.0.0 --watch json-server/generate-data.js &
ng serve --host 0.0.0.0
