import request from 'supertest';
import { App } from 'supertest/types';

type AdminCredential = {
  email: string;
  password: string;
};

type AdminLoginBody = {
  accessToken: string;
  user: {
    id: string;
    email: string;
  };
};

export type AdminLoginResult = {
  credential: AdminCredential;
  body: AdminLoginBody;
};

const LEGACY_ADMIN_CREDENTIAL: AdminCredential = {
  email: 'admin@school.local',
  password: 'ChangeMe123!',
};

const CURRENT_SEED_ADMIN_CREDENTIAL: AdminCredential = {
  email: 'mousa.mc13@gmail.com',
  password: 'M0usa!Awdi#2026$Secure',
};

function buildAdminCredentialCandidates(): AdminCredential[] {
  const candidates: AdminCredential[] = [];
  const addCandidate = (
    emailValue: string | undefined,
    passwordValue: string | undefined,
  ) => {
    const email = emailValue?.trim();
    const password = passwordValue?.trim();
    if (!email || !password) {
      return;
    }

    candidates.push({ email, password });
  };

  addCandidate(process.env.E2E_ADMIN_EMAIL, process.env.E2E_ADMIN_PASSWORD);
  addCandidate(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  candidates.push(LEGACY_ADMIN_CREDENTIAL, CURRENT_SEED_ADMIN_CREDENTIAL);

  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${candidate.email}:::${candidate.password}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export async function loginAsKnownAdmin(
  httpServer: () => App,
): Promise<AdminLoginResult> {
  const candidates = buildAdminCredentialCandidates();
  const attempts: string[] = [];

  for (const candidate of candidates) {
    const response = await request(httpServer()).post('/auth/login').send({
      email: candidate.email,
      password: candidate.password,
    });
    const responseBody = response.body as Partial<AdminLoginBody>;

    if (
      response.status === 200 &&
      typeof responseBody.accessToken === 'string' &&
      typeof responseBody.user?.id === 'string' &&
      typeof responseBody.user?.email === 'string'
    ) {
      return {
        credential: candidate,
        body: responseBody as AdminLoginBody,
      };
    }

    attempts.push(`${candidate.email} => ${response.status}`);
  }

  throw new Error(
    `Unable to authenticate using known admin credentials. Attempts: ${attempts.join(
      ', ',
    )}`,
  );
}
