import { OAuth2Client } from 'oslo/oauth2';
import type { OAuth2Provider } from 'arctic';

const authorizeEndpoint = 'https://sandbox.orcid.org/oauth/authorize';

const tokenEndpoint = 'https://sandbox.orcid.org/oauth/token';

class Orcid implements OAuth2Provider {
  private client: OAuth2Client;
  private clientSecret: string;

  constructor(
    clientId: string,
    clientSecret: string,
    options?: { redirectURI?: string }
  ) {
    this.client = new OAuth2Client(clientId, authorizeEndpoint, tokenEndpoint, {
      redirectURI: options?.redirectURI,
    });
    this.clientSecret = clientSecret;
  }

  public async createAuthorizationURL(
    state: string,
    options?: {
      scopes?: string[];
    }
  ): Promise<URL> {
    return this.client.createAuthorizationURL({
      state,
      scopes: options?.scopes ?? ['openid'],
    });
  }

  public async validateAuthorizationCode(code: string) {
    const result = await this.client.validateAuthorizationCode(code, {
      authenticateWith: 'request_body',
      credentials: this.clientSecret,
    });

    console.log(result);

    return {
      accessToken: result.access_token,
      idToken: result.id_token,
    };
  }
}

export const orcid = new Orcid(
  process.env.ORCID_CLIENT_ID!,
  process.env.ORCID_CLIENT_SECRET!,
  {
    redirectURI: 'http://localhost:3000/auth/orcid/callback',
  }
  //   {
  //     redirectURI: process.env.ORCID_REDIRECT_URI,
  //   }
);

export const orcidWithoutRedirect = new Orcid(
  process.env.ORCID_CLIENT_ID!,
  process.env.ORCID_CLIENT_SECRET!
);
