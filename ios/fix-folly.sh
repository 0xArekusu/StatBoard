#!/bin/bash

# Fix folly coroutines issue
echo "Fixing folly coroutines issue..."

# List of files to patch
files=(
  "ios/Pods/ReactNativeDependencies/Headers/folly/Expected.h"
  "ios/Pods/ReactNativeDependencies/Headers/folly/Optional.h"
  "ios/Pods/ReactNativeDependencies/framework/packages/react-native/ReactNativeDependencies.xcframework/Headers/folly/Expected.h"
  "ios/Pods/ReactNativeDependencies/framework/packages/react-native/ReactNativeDependencies.xcframework/Headers/folly/Optional.h"
)

for file in "${files[@]}"; do
  if [ -f "$file" ] && [ ! -L "$file" ]; then
    echo "Patching $file"
    sed -i '' 's/#if FOLLY_HAS_COROUTINES/#if 0/g' "$file"
  fi
done

echo "Folly fix applied successfully!"
