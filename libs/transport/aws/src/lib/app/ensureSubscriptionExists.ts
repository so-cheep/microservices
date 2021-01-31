import type { SNS } from 'aws-sdk'

export async function ensureSubscriptionExists(props: {
  sns: SNS
  topicArn: string
  queueArn: string
  deadLetterArn: string
  routes: string[]
  prefixes: string[]
  keepExistingSubscriptionFilters: boolean
}) {
  const {
    sns,
    topicArn,
    queueArn,
    deadLetterArn,
    routes,
    prefixes,
    keepExistingSubscriptionFilters,
  } = props

  const subscriptions = await sns
    .listSubscriptionsByTopic({ TopicArn: topicArn })
    .promise()

  const subscription = subscriptions.Subscriptions.find(
    x => x.Endpoint === queueArn,
  )

  const routeFilters = (<SubscriptionFilter[]>routes).concat(
    prefixes.map(prefix => ({ prefix })),
  )

  let subscriptionArn = subscription?.SubscriptionArn
  if (subscription) {
    const attr = await sns
      .getSubscriptionAttributes({
        SubscriptionArn: subscriptionArn,
      })
      .promise()

    const oldPolicy = attr.Attributes.FilterPolicy
      ? JSON.parse(attr.Attributes.FilterPolicy)
      : {}

    // const routeFilters = [...(oldPolicy?.route ?? [])]

    const existingRouteFilters = oldPolicy?.route ?? []

    if (!areFiltersSame(existingRouteFilters, routeFilters)) {
      const updatedRouteFilters = [
        ...(keepExistingSubscriptionFilters
          ? existingRouteFilters
          : []),
      ]
        .concat(routeFilters)
        .filter(uniqueSubscriptionFilter)

      if (updatedRouteFilters.length) {
        await sns
          .setSubscriptionAttributes({
            SubscriptionArn: subscriptionArn,
            AttributeName: 'FilterPolicy',
            AttributeValue: JSON.stringify({
              route: updatedRouteFilters,
            }),
          })
          .promise()

        console.log(
          'aws.transport',
          'subscription updated',
          topicArn,
          queueArn,
          updatedRouteFilters,
        )
      }
    }
  } else {
    const uniqueRouteFilters = routeFilters.filter(
      uniqueSubscriptionFilter,
    )

    const result = await sns
      .subscribe({
        Protocol: 'sqs',
        TopicArn: topicArn,
        Endpoint: queueArn,
        ReturnSubscriptionArn: true,
        Attributes: {
          FilterPolicy: JSON.stringify({
            route: uniqueRouteFilters,
          }),
          RedrivePolicy: JSON.stringify({
            deadLetterTargetArn: deadLetterArn,
          }),
        },
      })
      .promise()

    console.log(
      'aws.transport',
      'subscription created',
      topicArn,
      queueArn,
      deadLetterArn,
      uniqueRouteFilters,
    )

    subscriptionArn = result.SubscriptionArn
  }

  return subscriptionArn
}

function uniqueSubscriptionFilter(
  x: SubscriptionFilter,
  i: number,
  self: SubscriptionFilter[],
) {
  if (typeof x === 'object') {
    return (
      self.findIndex(
        y => typeof y === 'object' && y.prefix === x.prefix,
      ) === i
    )
  } else {
    return self.indexOf(x) === i
  }
}

function areFiltersSame(
  items1: SubscriptionFilter[],
  items2: SubscriptionFilter[],
) {
  return (
    items1.every(x => checkIfExists(x, items2)) &&
    items2.every(x => checkIfExists(x, items1))
  )
}

function checkIfExists(
  x: SubscriptionFilter,
  items: SubscriptionFilter[],
) {
  if (typeof x === 'object') {
    return items.find(
      y => typeof y === 'object' && y.prefix === x.prefix,
    )
  } else {
    return items.find(y => typeof y === 'string' && y === x)
  }
}

type SubscriptionFilter = string | { prefix: string }
