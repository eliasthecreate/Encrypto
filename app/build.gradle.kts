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

tasks.register<Copy>("copyWebAssets") {
    from(file("../web/dist"))
    into(file("src/main/assets/web"))
}

tasks.named("preBuild") {
    dependsOn("copyWebAssets")
}