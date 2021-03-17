# npm run build transport-core
# npm run build transport-rabbitmq
# npm run build transport-nats
npm run build utils
npm run build router -- --with-deps
npm run build adapters-nestjs -- --with-deps

cd dist/libs/transport/core
# npm publish --access public

# cd ../aws
# npm publish --access public

# cd ../nats
# npm publish --access public

# cd ../rabbitmq
# npm publish --access public


cd ../../utils
npm publish --access public

# cd ../router
# npm publish --access public

cd ../adapters/nestjs
npm publish --access public
