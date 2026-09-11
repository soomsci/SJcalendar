# 교내 내부 서명판 설치 안내

이 배포판은 소수 교직원 PC에서만 사용할 자체 서명판이다. 인증기관이 학교 신원을 확인한 공인
인증서가 아니므로 외부 공개 배포에는 사용하지 않는다.

## 배포 파일

- `SJcalendar-Internal-Code-Signing.cer`: 공개 인증서(개인키 없음)
- `삼정 학사일정_0.3.0_x64-setup.exe`: 해당 인증서로 서명된 설치 파일

인증서 지문은 `B74789451C63D897B6C020275F2277539508C151`, 인증서 파일의 SHA-256은
`7E2065510CEC013EEF26133EF1C08E843344B71D0E9012741EE02CB5D8C54E2A`이다. 인증서를 신뢰하기 전에
전달받은 값과 일치하는지 반드시 확인한다.

설치 파일의 SHA-256은 `2AD305F2F4960F8FBF8BC652612EAE094EE4DB993E164CF33EA932E35219DE2D`이다.

```powershell
Get-FileHash -Algorithm SHA256 .\SJcalendar-Internal-Code-Signing.cer
```

## 교직원 PC 설치

PowerShell에서 다음 명령을 실행한다. 현재 Windows 사용자에게만 적용되므로 관리자 권한은 필요하지
않다.

```powershell
$certPath = Resolve-Path .\SJcalendar-Internal-Code-Signing.cer
Import-Certificate -FilePath $certPath -CertStoreLocation Cert:\CurrentUser\Root
Import-Certificate -FilePath $certPath -CertStoreLocation Cert:\CurrentUser\TrustedPublisher
```

인증서 지문이 위 값과 일치하는지 확인한 뒤 설치 파일을 실행한다. 인증서를 신뢰하면 이 인증서의
개인키로 서명된 다른 프로그램도 신뢰 대상이 될 수 있으므로 인증서와 설치 파일은 학교 내부의
신뢰할 수 있는 경로로만 전달한다.

서명 상태는 다음처럼 확인하며 결과가 `Valid`인지 확인한다.

```powershell
Get-AuthenticodeSignature '.\삼정 학사일정_0.3.0_x64-setup.exe' |
  Format-List Status,StatusMessage,SignerCertificate,TimeStamperCertificate
```

자체 서명은 인증서를 수동으로 신뢰한 현재 사용자에게만 유효하다. PC의 Smart App Control 또는
학교 보안 정책이 자체 서명 앱을 별도로 차단하는 경우에는 전산 담당자의 허용 정책이 필요하다.

## 서명판 다시 빌드

인증서 개인키가 설치된 빌드 PC에서만 다음 명령이 성공한다.

```powershell
npm run tauri -- build --config src-tauri/tauri.internal-signing.conf.json
```

`.cer`에는 공개키만 있으므로 배포해도 되지만, 개인키나 내보낸 `.pfx` 파일은 저장소 또는 공유
폴더에 올리지 않는다.
