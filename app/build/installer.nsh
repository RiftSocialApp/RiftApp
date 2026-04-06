; Fully silent NSIS install. The app itself shows a splash/updater window
; on launch — this keeps the installer process invisible.

!macro preInit
  SetSilent silent
!macroend

; Launch the app after extraction completes.
; The app's built-in splash handles the "Updating…" UX.
!macro customInstall
  Exec '"$INSTDIR\${APP_EXECUTABLE_FILENAME}"'
!macroend
