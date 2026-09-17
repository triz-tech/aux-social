import crypto from "node:crypto";

import {
  createClient,
} from "@supabase/supabase-js";

/*
 * =========================================================
 * ENV
 * =========================================================
 */

function required(name) {
  const value =
    process.env[name];

  if (!value) {
    throw new Error(
      `Faltou ${name} no .env.local`
    );
  }

  return value;
}

const SUPABASE_URL =
  required(
    "NEXT_PUBLIC_SUPABASE_URL"
  );

const SERVICE_ROLE =
  required(
    "SUPABASE_SERVICE_ROLE_KEY"
  );

const SPOTIFY_CLIENT_ID =
  required(
    "SPOTIFY_CLIENT_ID"
  );

const SPOTIFY_CLIENT_SECRET =
  required(
    "SPOTIFY_CLIENT_SECRET"
  );

/*
 * Cliente administrativo.
 *
 * NUNCA usar SERVICE_ROLE
 * em código do navegador.
 */

const supabase =
  createClient(
    SUPABASE_URL,
    SERVICE_ROLE,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );

/*
 * =========================================================
 * PERFIS STARTER
 * =========================================================
 *
 * São personas editoriais do AUX,
 * não pessoas reais.
 */

const MOCKS = [
  {
    username:
      "depoisdas2",

    displayName:
      "depois das 2",

    bio:
      "r&b, soul e músicas que funcionam melhor de madrugada · starter do aux.",

    avatar:
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&h=400&q=80",
  },

  {
    username:
      "norepeat",

    displayName:
      "no repeat",

    bio:
      "pop, obsessões semanais e opiniões que podem mudar amanhã · starter do aux.",

    avatar:
      "https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=400&h=400&q=80",
  },

  {
    username:
      "bside",

    displayName:
      "b-side",

    bio:
      "álbuns inteiros, lados b e a faixa que ninguém colocou no single · starter do aux.",

    avatar:
      "https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?auto=format&fit=crop&w=400&h=400&q=80",
  },

  {
    username:
      "volumealto",

    displayName:
      "volume alto",

    bio:
      "mpb, rock, clássicos e nenhuma opinião em volume baixo · starter do aux.",

    avatar:
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=400&h=400&q=80",
  },
];

/*
 * =========================================================
 * REVIEWS
 * =========================================================
 */

const REVIEWS = [
  /*
   * ---------- NORA / POP ----------
   */

  {
    username:
      "norepeat",

    title:
      "hate that i made you love me",

    artist:
      "Ariana Grande",

    rating: 4.5,

    hoursAgo: 0.4,

    body:
      "Uma música sobre arrependimento que não tenta transformar a pessoa arrependida em vítima. Gosto disso. Ariana consegue fazer a faixa soar íntima sem precisar de uma produção gigantesca. Tem uma vulnerabilidade meio amarga aqui que deixa a música mais interessante depois de algumas ouvidas.",
  },

  {
    username:
      "norepeat",

    title:
      "Training Season",

    artist:
      "Dua Lipa",

    rating: 4,

    hoursAgo: 5.5,

    body:
      "É o tipo de pop que parece simples até você perceber que já ouviu quatro vezes seguidas. O refrão sabe exatamente o que está fazendo e infelizmente eu também sei: apertando replay.",
  },

  /*
   * ---------- DEPOIS DAS 2 ----------
   */

  {
    username:
      "depoisdas2",

    title:
      "Dracula",

    artist:
      "Tame Impala JENNIE",

    rating: 4.5,

    hoursAgo: 1.6,

    body:
      "Absolutamente ridícula. Absolutamente viciante. A música parece ter sido feita dentro de uma boate às 3 da manhã por alguém que decidiu que “normal” era uma palavra proibida. Tame Impala traz aquele psicodelismo eletrônico característico e JENNIE entra como se tivesse sido criada especificamente para esse universo. Não sei exatamente o que está acontecendo, mas quero ouvir de novo.",
  },

  {
    username:
      "depoisdas2",

    title:
      "Leave The Door Open",

    artist:
      "Silk Sonic",

    rating: 5,

    hoursAgo: 9,

    body:
      "Essa música genuinamente me faz querer ter uma sala com carpete, luz baixa e problemas financeiros dos anos 70.",
  },

  /*
   * ---------- B-SIDE ----------
   */

  {
    username:
      "bside",

    title:
      "So Easy (To Fall In Love)",

    artist:
      "Olivia Dean",

    rating: 4,

    hoursAgo: 3.2,

    body:
      "Bonita sem tentar desesperadamente provar que é bonita. A voz da Olivia é provavelmente a melhor parte: existe uma naturalidade nela que faz a música parecer muito mais próxima. É romântica, mas não chega naquele ponto açucarado em que você começa a sentir vergonha de estar ouvindo.",
  },

  {
    username:
      "bside",

    title:
      "Getting Older",

    artist:
      "Billie Eilish",

    rating: 4.5,

    hoursAgo: 14,

    body:
      "Tem alguma coisa especialmente cruel em perceber que crescer também significa começar a entender coisas que você preferia não entender. Ela canta quase sem levantar a voz e isso só piora tudo.",
  },

  /*
   * ---------- VOLUME ALTO ----------
   */

  {
    username:
      "volumealto",

    title:
      "Born To Die",

    artist:
      "Lana Del Rey",

    rating: 4.5,

    hoursAgo: 7,

    body:
      "A Lana conseguiu fazer estar triste parecer uma decisão estética e eu infelizmente comprei a ideia.",
  },

  {
    username:
      "volumealto",

    title:
      "Lady Marmalade",

    artist:
      "Christina Aguilera Lil' Kim Mya Pink",

    rating: 5,

    hoursAgo: 19,

    body:
      "Quatro mulheres entrando numa música como se cada uma tivesse cinco minutos para provar que é a maior estrela do planeta. Exagerada, barulhenta e exatamente por isso perfeita.",
  },
];

/*
 * =========================================================
 * SPOTIFY
 * =========================================================
 */

let spotifyToken = null;

async function getSpotifyToken() {
  if (spotifyToken) {
    return spotifyToken;
  }

  const basic =
    Buffer.from(
      `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
    ).toString(
      "base64"
    );

  const response =
    await fetch(
      "https://accounts.spotify.com/api/token",
      {
        method: "POST",

        headers: {
          Authorization:
            `Basic ${basic}`,

          "Content-Type":
            "application/x-www-form-urlencoded",
        },

        body:
          "grant_type=client_credentials",
      }
    );

  if (!response.ok) {
    throw new Error(
      "Spotify não liberou o token."
    );
  }

  const data =
    await response.json();

  spotifyToken =
    data.access_token;

  return spotifyToken;
}

async function findSpotifyTrack(
  title,
  artist
) {
  const token =
    await getSpotifyToken();

  /*
   * Busca simples é mais tolerante
   * para colaborações e subtítulos.
   */

  const query =
    `${title} ${artist}`;

  const response =
    await fetch(
      "https://api.spotify.com/v1/search" +
        `?q=${encodeURIComponent(
          query
        )}` +
        "&type=track&limit=5",
      {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      }
    );

  if (!response.ok) {
    throw new Error(
      `Spotify falhou buscando ${title}.`
    );
  }

  const data =
    await response.json();

  const items =
    data.tracks?.items ?? [];

  if (!items.length) {
    throw new Error(
      `Não achei "${title}" no Spotify.`
    );
  }

  /*
   * Por enquanto usamos o primeiro
   * resultado do Spotify.
   */

  return items[0];
}

/*
 * =========================================================
 * CRIAR / ENCONTRAR PERFIL
 * =========================================================
 */

async function ensureMockProfile(
  mock
) {
  /*
   * Se já existe, reutiliza.
   * Isso permite rodar o seed
   * novamente sem criar contas
   * duplicadas.
   */

  const {
    data: existing,
    error: findError,
  } =
    await supabase
      .from("profiles")
      .select("id")
      .eq(
        "username",
        mock.username
      )
      .maybeSingle();

  if (findError) {
    throw findError;
  }

  if (existing) {
    await supabase
      .from("profiles")
      .update({
        display_name:
          mock.displayName,

        bio:
          mock.bio,

        avatar_url:
          mock.avatar,

        onboarding_completed:
          true,
      })
      .eq(
        "id",
        existing.id
      );

    console.log(
      `↻ @${mock.username} já existia`
    );

    return existing.id;
  }

  /*
   * Conta técnica.
   * example.com é usado apenas
   * como identificador do mock.
   */

  const email =
    `aux.seed.${mock.username}@example.com`;

  const password =
    `Aux!${crypto
      .randomUUID()
      .replaceAll("-", "")
      .slice(0, 24)}`;

  const {
    data,
    error:
      createUserError,
  } =
    await supabase.auth.admin
      .createUser({
        email,
        password,

        /*
         * Não dispara e-mail de
         * confirmação.
         */
        email_confirm: true,

        user_metadata: {
          username:
            mock.username,

          display_name:
            mock.displayName,
        },
      });

  if (createUserError) {
    throw createUserError;
  }

  const user =
    data.user;

  if (!user) {
    throw new Error(
      `Não consegui criar @${mock.username}.`
    );
  }

  /*
   * Nosso trigger já cria profiles
   * ao criar auth.users.
   *
   * O upsert garante que a persona
   * receba exatamente o @ desejado.
   */

  const {
    error: profileError,
  } =
    await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,

          username:
            mock.username,

          display_name:
            mock.displayName,

          bio:
            mock.bio,

          avatar_url:
            mock.avatar,

          onboarding_completed:
            true,
        },
        {
          onConflict: "id",
        }
      );

  if (profileError) {
    throw profileError;
  }

  console.log(
    `✓ @${mock.username} criado`
  );

  return user.id;
}

/*
 * =========================================================
 * TRACK
 * =========================================================
 */

async function ensureTrack(
  review
) {
  const spotifyTrack =
    await findSpotifyTrack(
      review.title,
      review.artist
    );

  const {
    data: existing,
    error: findError,
  } =
    await supabase
      .from("tracks")
      .select("id")
      .eq(
        "provider",
        "spotify"
      )
      .eq(
        "provider_track_id",
        spotifyTrack.id
      )
      .maybeSingle();

  if (findError) {
    throw findError;
  }

  if (existing) {
    return existing.id;
  }

  const artwork =
    spotifyTrack.album
      ?.images?.[0]
      ?.url ?? null;

  const sourceUrl =
    spotifyTrack
      .external_urls
      ?.spotify;

  if (!sourceUrl) {
    throw new Error(
      `Spotify não retornou link para ${review.title}.`
    );
  }

  const {
    data: inserted,
    error: insertError,
  } =
    await supabase
      .from("tracks")
      .insert({
        provider:
          "spotify",

        provider_track_id:
          spotifyTrack.id,

        title:
          spotifyTrack.name,

        artist:
          spotifyTrack.artists
            .map(
              (artist) =>
                artist.name
            )
            .join(", "),

        album:
          spotifyTrack.album
            ?.name ?? null,

        artwork_url:
          artwork,

        source_url:
          sourceUrl,

        spotify_url:
          sourceUrl,

        duration_ms:
          spotifyTrack.duration_ms,
      })
      .select("id")
      .single();

  if (insertError) {
    throw insertError;
  }

  return inserted.id;
}

/*
 * =========================================================
 * REVIEW
 * =========================================================
 */

async function ensureReview(
  userId,
  trackId,
  review
) {
  /*
   * Evita duplicar o mesmo post
   * caso você rode o script de novo.
   */

  const {
    data: existing,
    error: findError,
  } =
    await supabase
      .from("posts")
      .select("id")
      .eq(
        "user_id",
        userId
      )
      .eq(
        "track_id",
        trackId
      )
      .eq(
        "type",
        "review"
      )
      .limit(1)
      .maybeSingle();

  if (findError) {
    throw findError;
  }

  const createdAt =
    new Date(
      Date.now() -
        review.hoursAgo *
          60 *
          60 *
          1000
    ).toISOString();

  if (existing) {
    const {
      error: updateError,
    } =
      await supabase
        .from("posts")
        .update({
          body:
            review.body,

          rating:
            review.rating,

          visibility:
            "public",

          created_at:
            createdAt,
        })
        .eq(
          "id",
          existing.id
        );

    if (updateError) {
      throw updateError;
    }

    console.log(
      `↻ ${review.title}`
    );

    return;
  }

  const {
    error: insertError,
  } =
    await supabase
      .from("posts")
      .insert({
        user_id:
          userId,

        track_id:
          trackId,

        type:
          "review",

        body:
          review.body,

        rating:
          review.rating,

        visibility:
          "public",

        created_at:
          createdAt,
      });

  if (insertError) {
    throw insertError;
  }

  console.log(
    `  ♫ ${review.title}`
  );
}

/*
 * =========================================================
 * EXECUTAR
 * =========================================================
 */

async function main() {
  console.log("");
  console.log(
    "aux. — criando starter profiles"
  );
  console.log("");

  const users =
    new Map();

  /*
   * Perfis.
   */

  for (
    const mock of MOCKS
  ) {
    const id =
      await ensureMockProfile(
        mock
      );

    users.set(
      mock.username,
      id
    );
  }

  console.log("");
  console.log(
    "criando reviews..."
  );
  console.log("");

  /*
   * Reviews.
   */

  for (
    const review of REVIEWS
  ) {
    const userId =
      users.get(
        review.username
      );

    if (!userId) {
      throw new Error(
        `Perfil @${review.username} não encontrado.`
      );
    }

    const trackId =
      await ensureTrack(
        review
      );

    await ensureReview(
      userId,
      trackId,
      review
    );
  }

  console.log("");
  console.log(
    "✓ seed concluído"
  );

  console.log(
    `${MOCKS.length} starter profiles`
  );

  console.log(
    `${REVIEWS.length} reviews`
  );

  console.log("");
  console.log(
    "@triz não foi alterada."
  );
  console.log("");
}

main().catch(
  (error) => {
    console.error("");
    console.error(
      "seed falhou:"
    );

    console.error(
      error
    );

    process.exit(1);
  }
);