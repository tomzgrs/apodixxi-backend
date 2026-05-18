#!/bin/bash

# Create MongoDB data directory if it doesn't exist
mkdir -p /home/runner/workspace/data/db

# Start MongoDB in the background
mongod --dbpath /home/runner/workspace/data/db --bind_ip 127.0.0.1 --port 27017 --logpath /home/runner/workspace/data/mongod.log --fork

# Wait for MongoDB to be ready
echo "Waiting for MongoDB to start..."
for i in {1..30}; do
    if mongo --quiet --eval "db.runCommand({ ping: 1 })" > /dev/null 2>&1; then
        echo "MongoDB is ready"
        break
    fi
    if mongod --version > /dev/null 2>&1; then
        sleep 1
    fi
    sleep 1
done
echo "Starting FastAPI server..."

# Start the FastAPI server on port 5000
exec uvicorn server:app --host 0.0.0.0 --port 5000 --reload
