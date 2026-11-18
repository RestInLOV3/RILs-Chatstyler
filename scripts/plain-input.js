// 채팅 입력창을 일반 텍스트 입력창으로 교체
// v14부터 채팅 입력창이 ProseMirror 에디터(<prose-mirror>)로 바뀌어
// 보내는 내용이 <p>...</p> HTML로 감싸지고, 붙여넣기 시 서식이 따라오며 Home 키 동작도 달라졌다.
// 이 설정을 켜면 에디터를 숨기고 v13처럼 <textarea>로 입력받아 글자 그대로 보낸다.

export const MODULE_ID = "rils-chatstyler";
export const PLAIN_INPUT_SETTING = "plainChatInput";

/** @type {HTMLTextAreaElement|null} */
let textarea = null;

export function registerPlainInputSetting() {
  game.settings.register(MODULE_ID, PLAIN_INPUT_SETTING, {
    name: "채팅 입력창 HTML 제거하기",
    hint:
      "v14부터 채팅 입력창이 서식 편집기로 바뀌어 메시지가 <p></p>로 감싸집니다. " +
      "켜면 v13처럼 일반 텍스트 입력창을 사용해 입력한 글자를 그대로 보냅니다. (새로고침 필요)",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true,
  });
}

export function isPlainInputEnabled() {
  return game.settings.get(MODULE_ID, PLAIN_INPUT_SETTING);
}

/**
 * ProseMirror 입력창 옆에 일반 텍스트 입력창을 붙이고, 원래 입력창은 숨긴다.
 * Foundry는 사이드바/팝아웃/알림 영역 사이로 입력창을 옮길 때마다 renderChatInput 훅을 부르므로
 * 그때마다 다시 호출해 원래 입력창 바로 뒤로 따라가게 한다.
 * @param {HTMLElement|undefined} editor  Foundry의 채팅 입력 요소
 */
export function attachPlainInput(editor) {
  // v13처럼 이미 일반 입력창이면 아무것도 하지 않음
  if (!editor || editor.tagName !== "PROSE-MIRROR") return;

  textarea ??= createTextarea(editor);

  // 단축키(채팅창 포커스)와 테마 CSS가 #chat-message를 기준으로 하므로 id를 넘겨받음
  editor.removeAttribute("id");
  editor.classList.remove("chat-input");
  editor.classList.add("rils-chatstyler-hidden-editor");

  const hadFocus = document.activeElement === textarea;
  editor.after(textarea);
  // Foundry가 입력창을 채팅 탭 안으로 옮길 때 포커스를 주므로 똑같이 맞춤
  if (hadFocus || editor.closest(".chat-form")) textarea.focus();
}

function createTextarea(editor) {
  const element = document.createElement("textarea");
  element.id = "chat-message";
  element.className = "chat-input rils-chatstyler-plain-input";
  element.name = "message";
  element.autocomplete = "off";
  element.spellcheck = false;
  element.setAttribute("aria-label", editor.getAttribute("aria-label") ?? game.i18n.localize("CHAT.Chat"));
  element.placeholder = game.i18n.localize("CHAT.EnterMessage");

  element.addEventListener("keydown", onKeyDown);
  element.addEventListener("input", () => (ui.chat.history.pending = element.value));
  return element;
}

/** @param {KeyboardEvent} event */
function onKeyDown(event) {
  // 한글 등 IME 조합 중의 Enter는 글자 확정용이므로 무시
  if (event.isComposing || event.keyCode === 229) return;
  if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;

  switch (event.key) {
    case "Enter":
      event.preventDefault();
      sendMessage();
      break;
    case "ArrowUp":
    case "ArrowDown":
      recallMessage(event);
      break;
  }
}

async function sendMessage() {
  const message = textarea.value;
  if (!message.trim()) return;
  try {
    await ui.chat.processMessage(message);
    recordMessage(message);
    textarea.value = "";
    ui.chat.history.pending = "";
  } catch (error) {
    Hooks.onError("ChatLog#processMessage", error, { notify: "error", log: "error", message });
  }
}

// 위/아래 화살표로 이전에 보낸 메시지 불러오기 (입력 중인 내용이 없을 때만)
function recallMessage(event) {
  const history = ui.chat.history;
  if (history.pending || !history.queue.length) return;
  event.preventDefault();
  const direction = event.key === "ArrowUp" ? 1 : -1;
  history.index = Math.clamp(history.index + direction, -1, history.queue.length - 1);
  textarea.value = history.queue[history.index] ?? "";
}

function recordMessage(message) {
  const history = ui.chat.history;
  if (history.queue.length >= ui.chat.constructor.MAX_MESSAGE_HISTORY) history.queue.pop();
  history.queue.unshift(message);
  history.index = -1;
}
