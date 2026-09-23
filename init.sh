#!/usr/bin/env bash
# init.sh — 사내 장비 대여 관리 웹앱 환경 부트스트랩
# 의존성 설치 -> DB 초기화/시드 -> 개발 서버 기동 -> 헬스체크 -> 접속 URL 출력 -> exit 0
set -euo pipefail

# --- 환경 가드 ---
if [ "$(node -p 'process.platform' 2>/dev/null)" != "linux" ]; then
  echo "ERROR: Windows용 Node가 잡혔습니다. WSL 안에 Node를 설치하세요." >&2
  echo "  현재 node: $(which node 2>/dev/null || echo '없음')" >&2
  exit 1
fi
# -----------------


cd "$(dirname "$0")"

PORT="${PORT:-3000}"
HEALTH_URL="http://localhost:${PORT}/health"
APP_URL="http://localhost:${PORT}/"
LOG_FILE="data/server.log"
PID_FILE="data/server.pid"

log() { printf '\n\033[1;36m[init]\033[0m %s\n' "$*"; }

# 크로스 플랫폼 프로세스 종료 (Windows git-bash / POSIX)
kill_pid() {
  local pid="$1"
  [ -z "${pid}" ] && return 0
  if command -v taskkill >/dev/null 2>&1; then
    taskkill //PID "${pid}" //F >/dev/null 2>&1 || true
  else
    kill "${pid}" >/dev/null 2>&1 || true
  fi
}

# PORT 를 점유한 프로세스 종료 (git-bash 는 $! 가 winpid 와 다르므로 포트 기준으로 정리)
free_port() {
  local port="$1"
  local pids=""
  if command -v netstat >/dev/null 2>&1 && command -v taskkill >/dev/null 2>&1; then
    # Windows: netstat 에서 LISTENING PID 추출
    pids="$(netstat -ano 2>/dev/null | grep -E "[:.]${port}[[:space:]]" | grep -i LISTEN | awk '{print $NF}' | sort -u || true)"
    for pid in ${pids}; do
      [ -n "${pid}" ] && taskkill //PID "${pid}" //F >/dev/null 2>&1 || true
    done
  elif command -v lsof >/dev/null 2>&1; then
    # POSIX
    pids="$(lsof -ti tcp:"${port}" 2>/dev/null || true)"
    for pid in ${pids}; do
      [ -n "${pid}" ] && kill "${pid}" >/dev/null 2>&1 || true
    done
  fi
  return 0
}

# 기존에 떠 있던 서버 정리 (멱등) — 포트 기준
log "기존 서버 정리 (포트 ${PORT})"
free_port "${PORT}"
rm -f "${PID_FILE}"

# 1) 의존성 설치
log "1/4 의존성 설치 (npm install)"
if [ -f package-lock.json ]; then
  npm ci || npm install
else
  npm install
fi

# 2) DB 초기화 + 시드
log "2/4 DB 초기화 및 시드 (npm run init-db)"
npm run init-db

# 3) 개발 서버 기동 (백그라운드)
log "3/4 개발 서버 기동"
mkdir -p data
: > "${LOG_FILE}"
node src/server.js >"${LOG_FILE}" 2>&1 &
SERVER_PID=$!
echo "${SERVER_PID}" > "${PID_FILE}"
disown "${SERVER_PID}" 2>/dev/null || true
log "서버 pid=${SERVER_PID}, 로그=${LOG_FILE}"

# 4) 헬스체크 (최대 30회, 1초 간격)
log "4/4 헬스체크: ${HEALTH_URL}"
HEALTHY=0
for i in $(seq 1 30); do
  if curl -fsS "${HEALTH_URL}" >/dev/null 2>&1; then
    HEALTHY=1
    break
  fi
  # 서버 프로세스가 죽었으면 조기 중단
  if ! kill -0 "${SERVER_PID}" 2>/dev/null; then
    break
  fi
  sleep 1
done

if [ "${HEALTHY}" -ne 1 ]; then
  log "헬스체크 실패. 서버 로그:"
  cat "${LOG_FILE}" || true
  kill_pid "${SERVER_PID}"
  free_port "${PORT}"
  rm -f "${PID_FILE}"
  exit 1
fi

log "헬스체크 성공 ✅"
printf '\n\033[1;32m서버가 실행 중입니다.\033[0m\n'
printf '  접속 URL   : %s\n' "${APP_URL}"
printf '  헬스체크   : %s\n' "${HEALTH_URL}"
printf '  서버 종료  : kill %s   (또는 taskkill //PID %s //F)\n\n' "${SERVER_PID}" "${SERVER_PID}"

exit 0
