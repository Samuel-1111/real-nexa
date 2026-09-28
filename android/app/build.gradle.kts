plugins {
    id("com.android.application")
    kotlin("android")
}

android {
    namespace = "com.samzytechnology.nexa"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.samzytechnology.nexa"
        minSdk = 23
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
        release {
            isMinifyEnabled = false
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.17.0")
    implementation("androidx.appcompat:appcompat:1.7.1")
    implementation("androidx.webkit:webkit:1.14.0")
}
