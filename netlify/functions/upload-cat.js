exports.handler = async (event) => {
  // Разрешаем только POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({
        error: 'Method not allowed'
      })
    };
  }

  try {
    const {
      kind,
      mime,
      data,
      remove
    } = JSON.parse(event.body || '{}');

    // Разрешены только good и bad
    if (!['good', 'bad'].includes(kind)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid kind'
        })
      };
    }

    // Переменные Supabase должны храниться в Netlify Environment Variables
    const base = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY;

    if (!base || !key) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Supabase server variables are not configured'
        })
      };
    }

    const bucket = 'trainer-cats';
    const filePath = `settings/${kind}.png`;

    // URL объекта Supabase Storage
    const url =
      `${base}/storage/v1/object/${bucket}/${filePath}`;

    const headers = {
      Authorization: `Bearer ${key}`,
      apikey: key
    };

    // -------------------------
    // УДАЛЕНИЕ КАРТИНКИ
    // -------------------------
    if (remove) {
      const response = await fetch(url, {
        method: 'DELETE',
        headers
      });

      if (!response.ok && response.status !== 404) {
        const errorText = await response.text();

        throw new Error(
          `Supabase delete error: ${errorText}`
        );
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true
        })
      };
    }

    // -------------------------
    // ПРОВЕРКА ФАЙЛА
    // -------------------------
    if (!data || !mime || !mime.startsWith('image/')) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Image required'
        })
      };
    }

    // Декодируем Base64
    const buffer = Buffer.from(data, 'base64');

    // Максимальный размер — 2 МБ
    if (buffer.length > 2 * 1024 * 1024) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'File too large. Maximum size is 2 MB.'
        })
      };
    }

    // -------------------------
    // ЗАГРУЗКА В SUPABASE
    // -------------------------
    const response = await fetch(url, {
      method: 'PUT',

      headers: {
        ...headers,
        'Content-Type': mime,
        'x-upsert': 'true',
        'cache-control': '0'
      },

      body: buffer
    });

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(
        `Supabase upload error: ${errorText}`
      );
    }

    // Публичный URL картинки
    const publicUrl =
      `${base}/storage/v1/object/public/${bucket}/${filePath}`;

    return {
      statusCode: 200,

      body: JSON.stringify({
        ok: true,
        kind,
        path: filePath,
        url: publicUrl
      })
    };

  } catch (error) {
    console.error('Upload cat error:', error);

    return {
      statusCode: 500,

      body: JSON.stringify({
        error: error.message || 'Upload failed'
      })
    };
  }
};
```
