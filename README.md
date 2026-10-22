# RILs Chat Styler

Foundry VTT 채팅창에서 채팅 꾸미기를 할 수 있게 해 주는 모듈입니다.
같은 화자의 연속 메시지를 하나로 묶어 보여 주고, 마크다운 강조·인라인 CSS·이미지 링크를 채팅 메시지 안에서 렌더링합니다.

인라인 CSS 형식은 롤20과 호환시켰습니다.

## 기능

### 1. 연속 메시지 병합

같은 화자가 연달아 보낸 메시지를 하나의 덩어리처럼 보이게 합니다.
같은 화자란 **같은 사용자가 같은 이름으로** 보낸 메시지를 말합니다. 이름이 같아도 보낸 사용자가 다르면 따로 표시합니다.

- 두 번째 메시지부터는 헤더(이름, 시간 등)를 숨기고, 메시지 사이 간격과 테두리를 없앱니다.
- 데이터를 실제로 합치지 않고 **화면에서만** 붙여 보이게 하므로, 각 메시지를 따로 수정·삭제할 수 있습니다.
- 다음 메시지는 병합하지 않으며, 그 앞뒤에서 연결이 끊깁니다.
  - 주사위 굴림이 포함된 메시지
  - 채팅 카드(`.chat-card`)나 주사위 결과(`.dice-roll`)가 있는 메시지 (CoC7 카드 포함)
  - `sch-customize` 모듈의 사담(`priv_talk`) 메시지

### 2. 마크다운 강조

| 입력                | 결과              |
| ------------------- | ----------------- |
| `*기울임*`          | _기울임_          |
| `**굵게**`          | **굵게**          |
| `***굵고 기울임***` | **_굵고 기울임_** |

링크, 코드, 주사위 결과, 시스템 채팅 카드 안의 `*`는 변환하지 않습니다.

### 3. 인라인 스타일 텍스트 (Roll20 문법)

Roll20에서 쓰던 링크 꾸미기 문법을 그대로 쓸 수 있습니다. Roll20용 매크로를 그대로 붙여 넣어도 같은 모양으로 나옵니다.

```
[내용](#" style="text-decoration:none; color:White; line-height:1.5; background-color:black; padding:4px;)
```

- Roll20처럼 닫는 따옴표 없이 `)`로 끝내면 됩니다. 닫는 따옴표(`")`)를 넣어도 똑같이 동작합니다.
- 마지막 속성 뒤의 세미콜론(`;`)은 생략해도 됩니다.
- `rgba(...)`, `url(...)`처럼 괄호가 들어간 값도 쓸 수 있습니다. (괄호 한 겹까지)
- 한 메시지 안에 여러 개를 섞어 써도 됩니다.
- 변환된 텍스트는 링크처럼 생겼지만 클릭해도 아무 동작을 하지 않습니다.

### 4. 이미지 링크 자동 표시

메시지에 이미지 URL **하나만** 단독으로 입력하면 채팅창에 이미지로 표시합니다.

```
https://example.com/picture.png
```

- `http://` 또는 `https://`로 시작하고, 확장자가 `png`, `jpg`, `jpeg`, `gif`, `webp`, `bmp`인 주소만 인식합니다. (뒤에 붙는 `?쿼리`는 허용)
- URL 앞뒤에 다른 텍스트가 있으면 변환하지 않습니다.

## 설치

Foundry VTT의 **애드온 모듈 → 모듈 설치** 화면에서 아래 매니페스트 URL을 붙여 넣으세요.

```
https://github.com/RestInLOV3/RILs-Chatstyler/releases/latest/download/module.json
```

설치한 뒤 월드의 **모듈 관리**에서 **RILs Chat Styler**를 활성화하면 됩니다. 별도 설정 항목은 없습니다.

## 호환성

- **Foundry VTT v13 이상**을 대상으로 합니다. v13에서 추가된 `renderChatMessageHTML` 훅만 사용하며, v13에서 지원 중단된 `renderChatMessage` 훅은 쓰지 않습니다.
- 사이드바 채팅 로그, 팝아웃 채팅, 채팅 알림 영역을 각각 따로 병합합니다.
- dnd5e(`dnd5e2`) 채팅 스타일 위에서도 병합 모양이 유지되도록 병합 관련 CSS에 `!important`를 사용합니다.
- 특정 게임 시스템에 의존하지 않습니다.
- **Chat Portrait**: 메시지 본문에 들어가는 이름 표시(`h4.chat-portrait-text-content-name-generic`)를 숨겨 이름이 두 번 나오지 않게 합니다.
- **DF Chat Enhancements**: 함께 사용할 때 병합이 풀리지 않도록 메시지 렌더링 후 병합을 다시 실행합니다.

## 알려진 제한

- 마크다운 변환은 단순한 정규식 기반이라, 중첩되거나 복잡한 문법(`**굵게 *안에 기울임* 굵게**` 등)은 의도대로 나오지 않을 수 있습니다.
- 일반 텍스트 안의 `*` 문자는 강조 문법으로 해석될 수 있습니다. 별표를 그대로 쓰고 싶으면 짝이 맞지 않게 쓰는 수밖에 없습니다.
- 같은 사용자가 같은 이름의 서로 다른 토큰으로 말하면 한 덩어리로 보입니다.

## 릴리스 (개발자용)

GitHub에서 Release를 **publish**하면 [`.github/workflows/main.yml`](.github/workflows/main.yml) 워크플로가 실행됩니다.

1. 태그(`v1.2.3` 또는 `1.2.3`)에서 버전을 읽어 `module.json`의 `version`, `url`, `manifest`, `download`를 채웁니다.
2. `module.json`, `README.md`, `LICENSE`, `scripts/`, `styles/`를 `module.zip`으로 묶습니다.
3. `module.json`과 `module.zip`을 해당 릴리스에 첨부합니다.

저장소의 `module.json`은 `#{VERSION}#` 같은 자리표시자가 들어 있는 템플릿이므로, 직접 버전을 적지 마세요.

로컬에서 모듈을 쓸 때는 모듈 폴더 이름이 `module.json`의 `id`(`rils-chatstyler`)와 같아야 Foundry가 인식합니다.

### 파일 구조

```
module.json            모듈 매니페스트 (릴리스 시 값 채움)
scripts/main.js        진입점. Foundry 훅 등록
scripts/format.js      본문 변환 (마크다운 강조, Roll20 스타일 텍스트, 이미지 링크)
scripts/merge.js       같은 화자의 연속 메시지 병합
styles/chat-styler.css 병합 모양 및 변환 결과 스타일
```

## 라이선스

[MIT](LICENSE) © 2025 RestInLOV3
