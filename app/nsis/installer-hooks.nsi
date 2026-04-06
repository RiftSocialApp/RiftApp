; ──────────────────────────────────────────────────
; Rift Dark Theme — NSIS Installer / Uninstaller
; Uses Windows 10/11 undocumented dark mode APIs + manual control coloring
; ──────────────────────────────────────────────────

; ── Override MUI2 global colours (consumed later by MUI_INTERFACE) ──
!ifdef MUI_BGCOLOR
  !undef MUI_BGCOLOR
!endif
!define MUI_BGCOLOR "0F1117"

!ifdef MUI_TEXTCOLOR
  !undef MUI_TEXTCOLOR
!endif
!define MUI_TEXTCOLOR "E2E8F0"

; Force classic (non-themed) checkbox/radio rendering so SetCtlColors text color works (MUI2 bug #443)
!define MUI_FORCECLASSICCONTROLS

; MUI2 GUI-init callbacks
!define MUI_CUSTOMFUNCTION_GUIINIT "RiftDarkInit"
!define MUI_CUSTOMFUNCTION_UNGUIINIT "un.RiftDarkInit"

; ── Enumerate children of a window and apply dark colors ──
; Uses $5, $6 as temp registers (not $R0-$R9 to avoid conflicts)
!macro _RiftColorChildren PARENT TAG
  StrCpy $5 0
  _rcl_${TAG}:
    System::Call 'user32::FindWindowExW(p ${PARENT}, p $5, p 0, p 0) p .s'
    Pop $6
    StrCmp $6 0 _rcd_${TAG}
    System::Call 'uxtheme::SetWindowTheme(p $6, w " ", w " ")'
    System::Call 'uxtheme::#133(p $6, i 1) i'
    SetCtlColors $6 E2E8F0 0F1117
    StrCpy $5 $6
    Goto _rcl_${TAG}
  _rcd_${TAG}:
!macroend

; ── Main dark-theme setup ────────────────────────
!macro _RiftApplyDark HWND TAG
  ; --- Phase 1: Enable Windows 10/11 dark mode ---
  ; Ordinal 135 = SetPreferredAppMode, value 2 = ForceDark
  System::Call 'uxtheme::#135(i 2)'
  ; Ordinal 104 = RefreshImmersiveColorPolicyState
  System::Call 'uxtheme::#104()'
  ; Dark title bar via DWM (attribute 20 = DWMWA_USE_IMMERSIVE_DARK_MODE)
  System::Call 'dwmapi::DwmSetWindowAttribute(p ${HWND}, i 20, *i 1, i 4)'
  ; Allow dark mode for main window (ordinal 133 = AllowDarkModeForWindow)
  System::Call 'uxtheme::#133(p ${HWND}, i 1) i'
  ; Dark background brush for main window class (GCL_HBRBACKGROUND = -10)
  System::Call 'gdi32::CreateSolidBrush(i 0x17110F) i .s'
  Pop $R4
  System::Call 'user32::SetClassLongPtrW(p ${HWND}, i -10, p $R4) p'
  ; Bottom panel background (SetCtlColors on HWNDPARENT controls the nav bar area)
  SetCtlColors ${HWND} E2E8F0 0F1117

  ; --- Phase 2: Inner page dialog ---
  FindWindow $R3 "#32770" "" ${HWND}
  StrCmp $R3 0 _rift_skip_inner_${TAG}
    System::Call 'gdi32::CreateSolidBrush(i 0x17110F) i .s'
    Pop $R4
    System::Call 'user32::SetClassLongPtrW(p $R3, i -10, p $R4) p'
    System::Call 'uxtheme::#133(p $R3, i 1) i'
    SetCtlColors $R3 E2E8F0 0F1117
    ; Dark-color all children of the inner dialog
    !insertmacro _RiftColorChildren $R3 inner_${TAG}
  _rift_skip_inner_${TAG}:

  ; --- Phase 3: Generic coloring of ALL main window children ---
  !insertmacro _RiftColorChildren ${HWND} main_${TAG}

  ; --- Phase 4: Specific control overrides (after generic pass) ---
  ; Header bar background (control 1034)
  GetDlgItem $R0 ${HWND} 1034
  SetCtlColors $R0 "" 0F1117
  ; Header title (control 1036)
  GetDlgItem $R0 ${HWND} 1036
  SetCtlColors $R0 E2E8F0 0F1117
  ; Header subtitle (control 1037)
  GetDlgItem $R0 ${HWND} 1037
  SetCtlColors $R0 8892B0 0F1117
  ; Inner page area (control 1018)
  GetDlgItem $R0 ${HWND} 1018
  SetCtlColors $R0 E2E8F0 0F1117
  ; Top separator line (control 1035)
  GetDlgItem $R0 ${HWND} 1035
  SetCtlColors $R0 2A2D3E 2A2D3E
  ; Bottom separator line (control 1038) — hide to avoid white artifact
  GetDlgItem $R0 ${HWND} 1038
  ShowWindow $R0 0
  ; Branding text (control 1028)
  GetDlgItem $R0 ${HWND} 1028
  SetCtlColors $R0 5A6178 0F1117

  ; --- Phase 5: Buttons with accent colors (after generic pass) ---
  ; Button 1 = Next / Install / Finish (purple accent)
  GetDlgItem $R0 ${HWND} 1
  System::Call 'uxtheme::SetWindowTheme(p $R0, w " ", w " ")'
  SetCtlColors $R0 FFFFFF 6366F1
  ; Button 2 = Cancel
  GetDlgItem $R0 ${HWND} 2
  System::Call 'uxtheme::SetWindowTheme(p $R0, w " ", w " ")'
  SetCtlColors $R0 E2E8F0 2A2D3E
  ; Button 3 = Back
  GetDlgItem $R0 ${HWND} 3
  System::Call 'uxtheme::SetWindowTheme(p $R0, w " ", w " ")'
  SetCtlColors $R0 E2E8F0 2A2D3E

  ; --- Phase 6: Refresh ---
  System::Call 'user32::SendMessageW(p ${HWND}, i 0x031A, p 0, p 0)'
  System::Call 'user32::InvalidateRect(p ${HWND}, p 0, i 1)'
!macroend

Function RiftDarkInit
  !insertmacro _RiftApplyDark $HWNDPARENT inst
FunctionEnd

Function un.RiftDarkInit
  !insertmacro _RiftApplyDark $HWNDPARENT uninst
FunctionEnd

; ── Per-page SHOW callback: re-color each new inner dialog ──
!macro _RiftPageShowImpl TAG
  FindWindow $R3 "#32770" "" $HWNDPARENT
  StrCmp $R3 0 _rift_psi_done_${TAG}
    ; Dark class background brush for the inner dialog
    System::Call 'gdi32::CreateSolidBrush(i 0x17110F) i .s'
    Pop $R4
    System::Call 'user32::SetClassLongPtrW(p $R3, i -10, p $R4) p'
    System::Call 'uxtheme::#133(p $R3, i 1) i'
    SetCtlColors $R3 E2E8F0 0F1117
    ; Color all children of the inner dialog
    !insertmacro _RiftColorChildren $R3 psi_${TAG}
    ; Repaint
    System::Call 'user32::InvalidateRect(p $R3, p 0, i 1)'
  _rift_psi_done_${TAG}:
!macroend

Function RiftPageShow
  !insertmacro _RiftPageShowImpl inst_page
FunctionEnd

Function un.RiftPageShow
  !insertmacro _RiftPageShowImpl uninst_page
FunctionEnd
