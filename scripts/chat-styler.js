// 채팅 로그 렌더링 시
Hooks.on("renderChatLog", (app, html, data) => {
  console.log("채팅 로그 렌더링 - 병합 기능 실행 중...");
  // 모든 메시지의 processed 속성 초기화 (새로고침 시 필요)
  document.querySelectorAll(".chat-message").forEach((el) => {
    el.removeAttribute("data-processed");
    el.classList.remove(
      "visually-merged",
      "has-continuation",
      "conversation-start"
    );
  });
  mergeChatMessages();
});

// 새 메시지가 추가될 때
Hooks.on("renderChatMessage", (message, html, data) => {
  // 약간의 지연을 두어 DOM이 완전히 렌더링되도록 함
  setTimeout(() => mergeChatMessages(), 10);
});

// 시각적 병합만 적용하는 방식
function mergeChatMessages() {
  const chatMessages = Array.from(document.querySelectorAll(".chat-message"));

  // 이미 처리된 메시지 제외
  const unprocessedMessages = chatMessages.filter(
    (el) => el.dataset.processed !== "true"
  );

  if (unprocessedMessages.length === 0) return;

  // 모든 메시지를 순서대로 처리
  let lastSpeaker = null;
  let lastElement = null;

  for (let i = 0; i < chatMessages.length; i++) {
    const element = chatMessages[i];

    // 메시지 ID 가져오기
    const messageId = element.dataset.messageId;
    if (!messageId) continue;

    // 메시지 객체 가져오기
    const message = game.messages.get(messageId);
    if (!message) continue;

    // 주사위 굴림이나 복잡한 HTML 구조가 있는 메시지는 처리하지 않음
    if (shouldSkipMessage(message, element)) {
      element.dataset.processed = "true";
      lastSpeaker = null; // 스킵된 메시지 이후에는 연결 끊김
      lastElement = null; // 스킵된 메시지 이후에는 연결 끊김
      continue;
    }

    const speaker = element
      .querySelector(".message-sender")
      ?.textContent.trim();

    if (lastSpeaker === speaker && lastElement) {
      // 시각적으로만 연결된 것처럼 보이게 함
      element.classList.add("visually-merged");

      // 이전 메시지와 시각적으로 연결
      lastElement.classList.add("has-continuation");

      // 처리 완료 표시
      element.dataset.processed = "true";
    } else {
      // 새 메시지 시작
      element.classList.add("conversation-start");
      element.dataset.processed = "true";

      lastSpeaker = speaker;
      lastElement = element;
    }
  }
}

// 메시지 처리 여부 확인 함수
function shouldSkipMessage(message, element) {
  // 주사위 굴림이 있는 메시지
  if (message.rolls && message.rolls.length > 0) return true;

  // 사담 메시지 또는 내레이터 메시지
  if (
    message.flags &&
    message.flags["sch-customize"] &&
    message.flags["sch-customize"].priv_talk
  ) {
    return true;
  }

  // 복잡한 HTML 구조 확인 (채팅 카드, 주사위 결과 등)
  const contentDiv = element.querySelector(".message-content");
  if (!contentDiv) return true;

  if (
    contentDiv.querySelector(".chat-card") ||
    contentDiv.querySelector(".dice-roll") ||
    contentDiv.innerHTML.includes('class="coc7 chat-card') || // COC7 시스템 카드 확인
    contentDiv.innerHTML.includes('<div class="dice-roll"')
  ) {
    // 주사위 굴림 결과 div 확인
    return true;
  }

  return false;
}

// CSS 스타일 추가 (한 번만)
const styleId = "chat-merger-style";
if (!document.getElementById(styleId)) {
  const styleElement = document.createElement("style");
  styleElement.id = styleId;
  styleElement.textContent = `
    /* 시각적 병합을 위한 CSS */
    .chat-message.visually-merged {
      margin-top: -8px; /* 이전 메시지와의 간격 줄이기 */
      border-top: none; /* 위쪽 테두리 제거 */
      border-top-left-radius: 0; /* 위쪽 모서리 둥글기 제거 */
      border-top-right-radius: 0;
      padding-top: 4px; /* 위쪽 패딩 조절 */
    }

    .chat-message.has-continuation {
      border-bottom: none; /* 아래쪽 테두리 제거 */
      border-bottom-left-radius: 0; /* 아래쪽 모서리 둥글기 제거 */
      border-bottom-right-radius: 0;
      margin-bottom: 0; /* 아래쪽 마진 제거 */
      padding-bottom: 4px; /* 아래쪽 패딩 조절 */
    }

    .chat-message.visually-merged .message-header {
      display: none; /* 병합된 메시지의 헤더(이름, 시간 등) 숨기기 */
    }

    /* h4 태그 숨기기 */
    .chat-message .message-content h4.chat-portrait-text-content-name-generic {
      display: none;
    }

    /* 대화 시작 메시지의 아래쪽 마진 */
    .chat-message.conversation-start:not(.has-continuation) {
      margin-bottom: 8px; /* 대화가 끝나는 메시지 아래에만 마진 적용 */
    }
    /* 연속된 메시지 블록의 경우 마진 조정 */
    .chat-message.has-continuation + .chat-message:not(.visually-merged) {
      margin-top: 8px; /* 연속 메시지 끝난 후 다음 메시지와의 간격 */
    }
  `;
  document.head.appendChild(styleElement);
}

// Foundry의 채팅 메시지 렌더링 후크에 연결하여 메시지 내용 수정 (Foundry VTT v13+)
Hooks.on("renderChatMessageHTML", (chatMessage, htmlElement, data) => {
  const contentElement = htmlElement.querySelector(".message-content");

  if (contentElement && contentElement.innerHTML) {
    let content = contentElement.innerHTML; // .message-content 안의 현재 HTML 내용

    // --- 변환된 최종 HTML 내용을 저장할 변수 ---
    let finalContent = content; // 초기값은 원래 내용

    // --- 0. 기울임꼴, 굵게, 굵고 기울임꼴 변환 로직 추가 ---
    // 주의: 중첩되거나 복잡한 마크다운 문법에는 완벽하게 작동하지 않을 수 있습니다.
    // 간단한 *내용*, **내용**, ***내용*** 패턴에 대해 작동합니다.

    // 굵고 기울임꼴 (***내용***) - 가장 먼저 처리해야 ** 기능이나 * 기능으로 잘못 변환되지 않음
    const boldItalicRegex = /\*\*\*(.+?)\*\*\*/g; // *** 와 *** 사이의 모든 문자 (.+?)
    finalContent = finalContent.replace(boldItalicRegex, (match, innerText) => {
      // innerText는 *** 와 *** 사이의 내용입니다.
      return `<b><i>${innerText}</i></b>`; // 굵고 기울임꼴 HTML 태그
    });

    // 굵게 (**내용**) - *** 기능 처리 후에 처리
    const boldRegex = /\*\*(.+?)\*\*/g; // ** 와 ** 사이의 모든 문자 (.+?)
    finalContent = finalContent.replace(boldRegex, (match, innerText) => {
      // innerText는 ** 와 ** 사이의 내용입니다.
      return `<b>${innerText}</b>`; // 굵게 HTML 태그
    });

    // 기울임꼴 (*내용*) - ***, ** 기능 처리 후에 처리
    const italicRegex = /\*(.+?)\*/g; // * 와 * 사이의 모든 문자 (.+?)
    finalContent = finalContent.replace(italicRegex, (match, innerText) => {
      // innerText는 * 와 * 사이의 내용입니다.
      return `<i>${innerText}</i>`; // 기울임꼴 HTML 태그
    });
    // ---------------------------------------------------------------------

    // --- 1. 기존: 특정 패턴([내용](#" style="...))을 <a> 태그로 변환 ---
    // 이 로직은 마크다운 변환 로직 이후에 적용됩니다.
    const styleLinkRegex = /\[([^\]]+)\]\(#"\s*style="([^"]+)\s*\)/g; // 정확한 정규식 사용 (닫는 따옴표 포함)

    finalContent = finalContent.replace(
      styleLinkRegex,
      (match, innerText, styleContent) => {
        styleContent = styleContent.trim();
        return `<a href="#" style="${styleContent} pointer-events: none; cursor: default;" class="my-clickable-style-link">${innerText}</a>`;
      }
    );
    // ---------------------------------------------------------------------

    // --- 2. 링크만 단독으로 입력된 경우 이미지 링크인지 확인하여 변환 ---
    // 이 로직은 다른 변환 로직 이후에 적용됩니다.
    const imageLinkOnlyRegex =
      /^\s*(https?:\/\/[^\s]+\.(png|jpe?g|gif|webp|bmp)(\?.*)?)\s*$/i;

    // 원본 contentElement.textContent의 앞뒤 공백 제거 후 테스트
    if (imageLinkOnlyRegex.test(contentElement.textContent.trim())) {
      const imageUrl = contentElement.textContent
        .trim()
        .match(imageLinkOnlyRegex)[1];

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

    // ---------------------------------------------------------------------

    // 변환된 최종 HTML을 원래 요소의 innerHTML에 적용합니다.
    contentElement.innerHTML = finalContent;

    // 병합 강제 트리거 (DF Chat Enhancements와 충돌 방지)
    setTimeout(() => {
      if (typeof mergeChatMessages === "function") mergeChatMessages();
    }, 20);

    // *** 변환된 <a> 태그 및 <img> 태그에 이벤트 리스너를 동적으로 추가합니다. ***
    const clickableElements = contentElement.querySelectorAll(
      ".my-clickable-style-link, .my-clickable-style-img"
    );

    clickableElements.forEach((element) => {
      element.addEventListener("click", (event) => {
        console.log("클릭 가능한 요소 클릭됨! 기본 동작 차단!");
        event.preventDefault();
        event.stopPropagation();
      });
    });
  } else {
    // .message-content 엘리먼트 또는 내용이 없는 경우
  }
});
