plugins {
    alias(libs.plugins.android.application)
}

android {
    namespace = "com.example.campusconnecticu"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.example.campusconnecticu"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            optimization {
                enable = false
            }
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
}

// Bundles the built SPA into the APK assets that MainActivity loads via
// file:///android_asset/web/index.html.
// Sync (not Copy) so stale hashed bundles are removed instead of accumulating.
// Skipped when dist/ is absent — a fresh clone still runs the committed assets
// until `npm run build` has been run.
tasks.register<Sync>("copyWebAssets") {
    val webDist = file("../dist")
    from(webDist)
    into(file("src/main/assets/web"))
    onlyIf { webDist.exists() }
}

tasks.named("preBuild") {
    dependsOn("copyWebAssets")
}