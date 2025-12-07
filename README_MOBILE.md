# הוראות להרצת האפליקציה בטלפון

## דרישות מוקדמות

### לאנדרואיד:
1. **Android Studio** - הורד והתקן מ: https://developer.android.com/studio
2. **Java Development Kit (JDK)** - בדרך כלל מותקן עם Android Studio
3. **USB Debugging** - הפעל בטלפון שלך (הגדרות > אפשרויות מפתח > USB Debugging)

### לאייפון:
1. **Mac עם macOS** - iOS דורש Mac
2. **Xcode** - הורד מ-App Store (חינם, אבל גדול מאוד - ~10GB)
3. **Apple Developer Account** - חינמי לפיתוח, אבל דורש הרשמה

## שלבים להרצה

### 1. בניית קבצי ה-Web
לפני כל פעולה, צריך לבנות את קבצי ה-Web:
```bash
npm run build:web
```

### 2. סנכרון עם Capacitor
לאחר כל שינוי בקבצים, צריך לסנכרן:
```bash
npm run cap:sync
```

### 3. הרצה על אנדרואיד

#### א. פתיחת Android Studio:
```bash
npm run android
```
זה יפתח את Android Studio עם הפרויקט.

#### ב. חיבור הטלפון:
1. חבר את הטלפון למחשב עם כבל USB
2. הפעל USB Debugging בטלפון
3. אישר את ההרשאה בטלפון (אם מופיעה)

#### ג. הרצה:
1. ב-Android Studio, לחץ על כפתור ה-Run (▶️) או `Shift+F10`
2. בחר את הטלפון שלך מהרשימה
3. האפליקציה תותקן ותופעל על הטלפון

### 4. הרצה על אייפון (רק ב-Mac)

#### א. פתיחת Xcode:
```bash
npm run ios
```
זה יפתח את Xcode עם הפרויקט.

#### ב. הגדרת חתימה:
1. ב-Xcode, בחר את הפרויקט (בצד שמאל)
2. בחר את ה-Target (App)
3. לך ל-"Signing & Capabilities"
4. בחר את ה-Team שלך (אם יש לך Apple Developer Account)
5. אם אין לך, תוכל להירשם בחינם

#### ג. הרצה:
1. בחר סימולטור או טלפון מחובר
2. לחץ על כפתור ה-Run (▶️) או `Cmd+R`
3. האפליקציה תותקן ותופעל

## בניית APK לאנדרואיד (להפצה)

1. פתח את Android Studio
2. בחר `Build > Generate Signed Bundle / APK`
3. בחר APK
4. צור Key Store (אם אין לך)
5. בחר את ה-Build Variant (release)
6. לחץ Finish
7. ה-APK יהיה ב: `android/app/release/app-release.apk`

## בניית IPA לאייפון (להפצה)

1. פתח את Xcode
2. בחר `Product > Archive`
3. לחץ על `Distribute App`
4. בחר את שיטת ההפצה (App Store, Ad Hoc, וכו')
5. עקוב אחר ההוראות

## הערות חשובות

- **לאחר כל שינוי בקבצים** (`index.html`, `app.js`, `styles.css`, `recommended.html`), צריך להריץ `npm run cap:sync`
- **גיאולוקציה** - האפליקציה דורשת הרשאות גיאולוקציה. ודא שהן מוגדרות נכון ב-AndroidManifest.xml (Android) וב-Info.plist (iOS)
- **רשת** - האפליקציה דורשת חיבור לאינטרנט לבדיקת מזג האוויר

## פתרון בעיות

### Android Studio לא מזהה את הטלפון:
- ודא ש-USB Debugging מופעל
- נסה כבל USB אחר
- התקן את ה-Drivers של הטלפון

### שגיאות בנייה:
- ודא שהריצת `npm run build:web` לפני `npm run cap:sync`
- נקה את ה-Build: `Build > Clean Project` ב-Android Studio

### iOS לא עובד ב-Windows:
- iOS דורש Mac. אין דרך להריץ iOS ב-Windows ללא Mac

