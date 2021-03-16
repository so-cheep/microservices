npm run build transport-core
npm run build transport-api
# npm run build transport-aws
npm run build transport-rabbitmq
npm run build utils
npm run build router -- --with-deps
npm run build adapters-nestjs -- --with-deps

cd dist/libs/transport/core
npm publish --access public --tag beta

# cd ../api
# npm publish --access public --tag beta

# cd ../aws
# npm publish --access public --tag beta

cd ../rabbitmq
# npm publish --access public --tag beta

# cd ../../router
# npm publish --access public --tag beta

# cd ../../adapters/nestjs
# npm publish --access public --tag beta
