// 起動
import './style.css';
import './data'; // 読み込みと検査。おかしなデータならここで止まる
import { unlockAudio } from './audio';
import { zukanCount } from './core/zukan';
import { savedChallenge, startChallenge } from './modes/challenge';
import { startSingle } from './modes/single';
import { loadZukan, PREF_IDS } from './modes/zukanStore';
import { showTitleScreen } from './ui/screens/title';
import { showZukanScreen } from './ui/screens/zukan';

const root = document.querySelector<HTMLDivElement>('#app')!;

function toTitle(): void {
  showTitleScreen(root, {
    onSingle: () => startSingle(root, toTitle),
    onChallenge: () => startChallenge(root, toTitle),
    onZukan: () => showZukanScreen(root, loadZukan(), toTitle),
    saved: savedChallenge(),
    zukanCount: zukanCount(loadZukan(), PREF_IDS),
  });
}

// iOS などは、利用者が触ったときに音を鳴らせるようにする
document.addEventListener('pointerdown', unlockAudio, { capture: true, passive: true });

toTitle();
