import { pusherApiGatewayClient } from './pusher-api-gateway-client';

describe('pusherApiGatewayClient', () => {
  it('should work', () => {
    expect(pusherApiGatewayClient()).toEqual('pusher-api-gateway-client');
  });
});
