import { formatMessageContent } from "./format.js";
import { mergeChatMessages } from "./merge.js";
import { attachPlainInput, isPlainInputEnabled, registerPlainInputSetting } from "./plain-input.js";

Hooks.once("init", registerPlainInputSetting);

// v14 채팅 입력창(ProseMirror)을 일반 텍스트 입력창으로 교체
// 입력창이 사이드바·팝아웃·알림 영역으로 옮겨질 때마다 따라가도록 매번 다시 붙임
Hooks.on("renderChatInput", (app, elements) => {
  if (isPlainInputEnabled()) attachPlainInput(elements["#chat-message"]);
});
Hooks.once("ready", () => {
  if (isPlainInputEnabled()) attachPlainInput(document.querySelector("prose-mirror.chat-input"));
});

// 짧은 시간 안에 여러 번 호출되어도 병합은 한 번만 실행
// (메시지가 렌더링된 직후에는 아직 DOM에 붙어 있지 않으므로 약간 늦게 실행)
let mergeTimer = null;
function scheduleMerge() {
  clearTimeout(mergeTimer);
  mergeTimer = setTimeout(mergeChatMessages, 20);
}

// 메시지가 렌더링될 때마다 본문을 변환하고 병합을 다시 계산 (Foundry VTT v13+)
Hooks.on("renderChatMessageHTML", (message, html) => {
  const content = html.querySelector(".message-content");
  if (content) formatMessageContent(content);
  scheduleMerge();
});

// 채팅 로그가 다시 그려지거나 메시지가 삭제되면 병합을 다시 계산
Hooks.on("renderChatLog", scheduleMerge);
Hooks.on("deleteChatMessage", scheduleMerge);
