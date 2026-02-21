// Social media posting module — Facebook + Instagram via Meta Graph API

const GRAPH_API = 'https://graph.facebook.com/v19.0';

/**
 * Post text (+optional image) to a Facebook Page
 */
export async function postToFacebook({ pageId, accessToken, text, imageUrl }) {
  if (!pageId || !accessToken) throw new Error('Facebook niet geconfigureerd');

  const endpoint = imageUrl
    ? `${GRAPH_API}/${pageId}/photos`
    : `${GRAPH_API}/${pageId}/feed`;

  const body = imageUrl
    ? { url: imageUrl, caption: text, access_token: accessToken }
    : { message: text, access_token: accessToken };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (data.error) throw new Error(`Facebook: ${data.error.message}`);
  return data.id || data.post_id;
}

/**
 * Post to Instagram Business (2-step: create container → publish)
 */
export async function postToInstagram({ accountId, accessToken, text, imageUrl }) {
  if (!accountId || !accessToken) throw new Error('Instagram niet geconfigureerd');
  if (!imageUrl) throw new Error('Instagram vereist een afbeelding');

  // Step 1: Create media container
  const containerRes = await fetch(`${GRAPH_API}/${accountId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: imageUrl,
      caption: text,
      access_token: accessToken,
    }),
  });

  const container = await containerRes.json();
  if (container.error) throw new Error(`Instagram container: ${container.error.message}`);

  // Step 2: Wait for processing
  await new Promise(r => setTimeout(r, 3000));

  // Step 3: Publish
  const publishRes = await fetch(`${GRAPH_API}/${accountId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: container.id,
      access_token: accessToken,
    }),
  });

  const published = await publishRes.json();
  if (published.error) throw new Error(`Instagram publish: ${published.error.message}`);
  return published.id;
}

/**
 * Post to configured platforms
 */
export async function postToSocial({ config, text, imageUrl, platform = 'both' }) {
  const results = { facebook: null, instagram: null, errors: [] };

  if ((platform === 'both' || platform === 'facebook') && config.facebook_page_id) {
    try {
      results.facebook = await postToFacebook({
        pageId: config.facebook_page_id,
        accessToken: config.facebook_access_token,
        text,
        imageUrl,
      });
    } catch (e) {
      results.errors.push(`Facebook: ${e.message}`);
    }
  }

  if ((platform === 'both' || platform === 'instagram') && config.instagram_account_id) {
    try {
      results.instagram = await postToInstagram({
        accountId: config.instagram_account_id,
        accessToken: config.facebook_access_token, // Same token for IG via Meta
        text,
        imageUrl,
      });
    } catch (e) {
      results.errors.push(`Instagram: ${e.message}`);
    }
  }

  return results;
}
