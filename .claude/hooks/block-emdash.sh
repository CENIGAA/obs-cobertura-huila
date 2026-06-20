#!/usr/bin/env bash
# Bloquea el carácter em dash (—) en Write/Edit/MultiEdit.
# Regla CENIGAA obs-cobertura-huila: no se permite "—" en el sitio.
# Recibe el JSON del hook por stdin y, si detecta el carácter en el
# contenido que se va a escribir, deniega la operación.

input=$(cat)

content=$(printf '%s' "$input" | jq -r '
  [ .tool_input.content,
    .tool_input.new_string,
    ( .tool_input.edits[]?.new_string )
  ] | map(select(. != null)) | join("\n")
')

if printf '%s' "$content" | grep -q '—'; then
  printf '%s' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"El caracter em dash (—) esta prohibido en este proyecto. Usa \"·\" como separador o \"-\" en su lugar."}}'
fi
