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

  const headers = {
    'Authorization': `Klaviyo-API-Key ${PRIVATE_KEY}`,
    'Content-Type': 'application/json',
    'revision': '2024-10-15'
  };

  try {
    // Step 1: Subscribe profile to list (no custom properties here — not supported by this endpoint)
    const subResponse = await fetch(
      'https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          data: {
            type: 'profile-subscription-bulk-create-job',
            attributes: {
              profiles: {
                data: [{
                  type: 'profile',
                  attributes: {
                    email,
                    subscriptions: {
                      email: { marketing: { consent: 'SUBSCRIBED' } }
                    }
                  }
                }]
              }
            },
            relationships: {
              list: { data: { type: 'list', id: listId } }
            }
          }
        })
      }
    );

    const subText = await subResponse.text();
    console.log('Subscribe response:', subResponse.status, subText);

    if (subResponse.status >= 400) {
      return res.status(200).json({ success: false, klaviyoStatus: subResponse.status, error: subText });
    }

    // Step 2: Tag profile with reservation type via custom event
    if (reservationType) {
      await fetch('https://a.klaviyo.com/api/events/', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          data: {
            type: 'event',
            attributes: {
              metric: { data: { type: 'metric', attributes: { name: 'Anima Reservation' } } },
              profile: { data: { type: 'profile', attributes: { email } } },
              properties: { reservation_type: reservationType }
            }
          }
        })
      }).catch(e => console.log('Event error (non-fatal):', e.message));
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
