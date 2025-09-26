#!/bin/bash
echo "Building AsanaBridge Menu Bar Status App..."
swiftc -o AsanaBridgeMenuBar main.swift -framework Cocoa -framework Foundation
echo "✅ Built AsanaBridgeMenuBar"
echo "Run with: ./AsanaBridgeMenuBar"
