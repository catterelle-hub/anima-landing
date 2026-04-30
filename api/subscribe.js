module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, listId, reservationType } = req.body;
  if (!email || !listId) return res.status(400).json({ error: 'Missing fields' });

  const PRIVATE_KEY = process.env.KLAVIYO_PRIVATE_KEY;
  if (!PRIVATE_KEY) return res.status(500).json({ error: 'Missing API key' });

  try {
    const response = await fetch(
      'https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/',
      {
        method: 'POST',
        headers: {
          'Authorization': `Klaviyo-API-Key ${PRIVATE_KEY}`,
          'Content-Type': 'application/json',
          'revision': '2023-12-15'
        },
        body: JSON.stringify({
          data: {
            type: 'profile-subscription-bulk-create-job',
            attributes: {
              profiles: {
                data: [
                  {
                    type: 'profile',
                    attributes: {
                      email: email,
                      properties: reservationType ? { reservation_type: reservationType } : {},
                      subscriptions: {
                        email: {
                          marketing: {
                            consent: 'SUBSCRIBED'
                          }
                        }
                      }
                    }
                  }
                ]
              }
            },
            relationships: {
              list: {
                data: {
                  type: 'list',
                  id: listId
                }
              }
            }
          }
        })
      }
    );

    const responseText = await response.text();
    console.log('Klaviyo response:', response.status, responseText);
    return res.status(200).json({ success: true, klaviyoStatus: response.status });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
