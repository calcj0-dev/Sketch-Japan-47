// 起動（画面は #4・#5 で作る）
import './style.css';
import './data'; // 読み込みと検査。おかしなデータならここで止まる
import { t } from './i18n';
import { APP_VERSION } from './version';

const app = document.querySelector<HTMLDivElement>('#app')!;
const h1 = document.createElement('h1');
h1.textContent = t('app.name');
const ver = document.createElement('p');
ver.className = 'version';
ver.textContent = t('app.version', { version: APP_VERSION });
const tag = document.createElement('p');
tag.textContent = t('app.tagline');
app.append(ver, h1, tag);
