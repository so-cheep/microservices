npm run build transport-core
npm run build transport-api
# npm run build transport-aws
npm run build transport-rabbitmq

cd dist/libs/transport/core
npm publish --access public --tag beta

cd ../api
npm publish --access public --tag beta

# cd ../aws
# npm publish --access public --tag beta

cd ../rabbitmq
npm publish --access public --tag beta
