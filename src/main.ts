// 起動
import './style.css';
import './data'; // 読み込みと検査。おかしなデータならここで止まる
import { startSingle } from './modes/single';
import { showTitleScreen } from './ui/screens/title';

const root = document.querySelector<HTMLDivElement>('#app')!;

function toTitle(): void {
  showTitleScreen(root, () => startSingle(root, toTitle));
}

toTitle();
