// 起動（作業 #1：空のページ。画面は #4・#5 で作る）
import './style.css';
import ja from './data/i18n/ja.json';
import { APP_VERSION } from './version';

const app = document.querySelector<HTMLDivElement>('#app')!;
const h1 = document.createElement('h1');
h1.textContent = ja.app.name;
const ver = document.createElement('p');
ver.className = 'version';
ver.textContent = ja.app.version.replace('{version}', APP_VERSION);
const tag = document.createElement('p');
tag.textContent = ja.app.tagline;
app.append(ver, h1, tag);
