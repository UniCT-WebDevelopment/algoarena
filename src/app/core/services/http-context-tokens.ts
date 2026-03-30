import { HttpContextToken } from '@angular/common/http';

export const CHALLENGE_RETRIED = new HttpContextToken<boolean>(() => false);
export const SKIP_SECURITY_CHALLENGE = new HttpContextToken<boolean>(() => false);
