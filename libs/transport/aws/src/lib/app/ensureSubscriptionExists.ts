import type { SNS } from 'aws-sdk'

export async function ensureSubscriptionExists(props: {
  sns: SNS
  topicArn: string
  queueArn: string
  deadLetterArn: string
  patterns: string[]
}) {
  const { sns, topicArn, queueArn, deadLetterArn, patterns } = props

  const subscriptions = await sns
    .listSubscriptionsByTopic({ TopicArn: topicArn })
    .promise()

  const subscription = subscriptions.Subscriptions.find(
    x => x.Endpoint === queueArn,
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

    const routeFilters = [...(oldPolicy?.route ?? [])]

    const applyPatterns = patterns.filter(
      prefix => !routeFilters.some(x => x.prefix === prefix),
    )

    if (applyPatterns.length) {
      await sns
        .setSubscriptionAttributes({
          SubscriptionArn: subscriptionArn,
          AttributeName: 'FilterPolicy',
          AttributeValue: JSON.stringify({
            route: routeFilters.concat(
              applyPatterns.map(prefix => ({ prefix })),
            ),
          }),
        })
        .promise()
    }
  } else {
    const result = await sns
      .subscribe({
        Protocol: 'sqs',
        TopicArn: topicArn,
        Endpoint: queueArn,
        ReturnSubscriptionArn: true,
        Attributes: {
          FilterPolicy: JSON.stringify({
            route: patterns.map(prefix => ({ prefix })),
          }),
          RedrivePolicy: JSON.stringify({
            deadLetterTargetArn: deadLetterArn,
          }),
        },
      })
      .promise()

    subscriptionArn = result.SubscriptionArn
  }

  return subscriptionArn
}
