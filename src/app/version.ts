/** 앱 버전 (package.json version, 빌드 때 주입). 문의·오류 기록에 함께 남긴다. */
export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0';
