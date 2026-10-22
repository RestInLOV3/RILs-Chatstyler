// 병합 상태를 나타내는 클래스
const MERGE_CLASSES = ["visually-merged", "has-continuation", "conversation-start"];

// Roll20 스타일 텍스트: [내용](#" style="...)
// 스타일 안의 rgba(), url() 같은 괄호 한 겹까지 허용하고, 닫는 따옴표는 있어도 없어도 됨
const STYLE_LINK_REGEX = /\[([^\]]+)\]\(#"\s*style="((?:[^"()]|\([^"()]*\))+)"?\s*\)/g;

// 이미지 주소만 단독으로 입력된 메시지
const IMAGE_LINK_ONLY_REGEX = /^\s*(https?:\/\/[^\s]+\.(png|jpe?g|gif|webp|bmp)(\?.*)?)\s*$/i;

// 짧은 시간 안에 여러 번 호출되어도 병합은 한 번만 실행
let mergeTimer = null;
function scheduleMerge() {
  clearTimeout(mergeTimer);
  mergeTimer = setTimeout(mergeChatMessages, 20);
}

// 채팅 로그가 다시 그려지거나 메시지가 삭제되면 병합을 다시 계산
Hooks.on("renderChatLog", scheduleMerge);
Hooks.on("deleteChatMessage", scheduleMerge);

// 메시지가 렌더링될 때 내용을 변환하고 병합을 다시 계산 (Foundry VTT v13+)
Hooks.on("renderChatMessageHTML", (chatMessage, htmlElement) => {
  const contentElement = htmlElement.querySelector(".message-content");
  if (contentElement) styleMessageContent(chatMessage, contentElement);
  scheduleMerge();
});

// 시각적 병합만 적용하는 방식
function mergeChatMessages() {
  // 채팅 로그, 팝아웃, 알림 영역 등 메시지 목록마다 따로 처리
  const lists = new Set(
    Array.from(document.querySelectorAll(".chat-message"), (el) => el.parentElement)
  );
  for (const list of lists) {
    if (list) mergeMessageList(list);
  }
}

function mergeMessageList(list) {
  let lastSpeaker = null;
  let lastElement = null;

  for (const element of list.querySelectorAll(":scope > .chat-message")) {
    // 매번 처음부터 다시 계산하므로 이전 결과는 지움
    element.classList.remove(...MERGE_CLASSES);

    const message = game.messages.get(element.dataset.messageId);

    // 주사위 굴림이나 복잡한 HTML 구조가 있는 메시지는 처리하지 않고, 연결도 끊음
    if (!message || shouldSkipMessage(message, element)) {
      lastSpeaker = null;
      lastElement = null;
      continue;
    }

    const speaker = element.querySelector(".message-sender")?.textContent.trim();

    if (lastElement && speaker && speaker === lastSpeaker) {
      // 이전 메시지와 시각적으로 연결
      element.classList.add("visually-merged");
      lastElement.classList.add("has-continuation");
    } else {
      // 새 메시지 시작
      element.classList.add("conversation-start");
      lastSpeaker = speaker;
    }

    // 중간 메시지도 다음 메시지와 이어지도록 항상 직전 메시지를 기준으로 삼음
    lastElement = element;
  }
}

// 메시지 처리 여부 확인 함수
function shouldSkipMessage(message, element) {
  // 주사위 굴림이 있는 메시지
  if (message.rolls?.length > 0) return true;

  // 사담 메시지 또는 내레이터 메시지
  if (message.flags?.["sch-customize"]?.priv_talk) return true;

  // 복잡한 HTML 구조 확인 (채팅 카드, 주사위 결과 등)
  const contentDiv = element.querySelector(".message-content");
  if (!contentDiv) return true;

  return Boolean(
    contentDiv.querySelector(".chat-card") ||
      contentDiv.querySelector(".dice-roll") ||
      contentDiv.innerHTML.includes('class="coc7 chat-card') // COC7 시스템 카드 확인
  );
}

// 메시지 내용의 마크다운, Roll20 스타일 텍스트, 이미지 링크를 변환
function styleMessageContent(chatMessage, contentElement) {
  const content = contentElement.innerHTML;
  if (!content) return;

  let finalContent = content;

  // --- 0. 기울임꼴, 굵게, 굵고 기울임꼴 ---
  // 주의: 중첩되거나 복잡한 마크다운 문법에는 완벽하게 작동하지 않을 수 있습니다.
  // *** 를 먼저 처리해야 ** 나 * 로 잘못 변환되지 않음
  finalContent = finalContent
    .replace(/\*\*\*(.+?)\*\*\*/g, "<b><i>$1</i></b>")
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/\*(.+?)\*/g, "<i>$1</i>");

  // --- 1. Roll20 스타일 텍스트를 <a> 태그로 변환 ---
  finalContent = finalContent.replace(STYLE_LINK_REGEX, (match, innerText, styleContent) => {
    // 마지막 속성에 세미콜론이 없어도 뒤에 붙는 속성과 섞이지 않도록 보정
    let style = styleContent.trim();
    if (style && !style.endsWith(";")) style += ";";
    return `<a href="#" style="${style} pointer-events: none; cursor: default;" class="my-clickable-style-link">${innerText}</a>`;
  });

  // --- 2. 링크만 단독으로 입력된 경우 이미지로 변환 ---
  const imageMatch = contentElement.textContent.trim().match(IMAGE_LINK_ONLY_REGEX);
  if (imageMatch) {
    const imageUrl = imageMatch[1];

    // 기존 메시지의 화자 이름 유지
    const speakerName = chatMessage.speaker?.alias || "Unknown";

    // 메시지 구조 유지: 화자명은 .message-sender 클래스와 동일한 위치에 있어야 병합 로직에서 감지됨
    finalContent = `
      <div class="chat-portrait-message-block">
        <div class="chat-portrait-text-content">
          <div class="message-sender" style="display:none;">${speakerName}</div>
          <img src="${imageUrl}" class="my-clickable-style-img" style="max-width: 100%; height: auto; pointer-events: none; cursor: default;">
        </div>
      </div>
    `;
  }

  // 바뀐 게 없으면 다시 쓰지 않음 (시스템이 붙인 버튼 이벤트 등이 날아가지 않도록)
  if (finalContent !== content) contentElement.innerHTML = finalContent;
}
