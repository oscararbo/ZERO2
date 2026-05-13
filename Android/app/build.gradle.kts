plugins {
  id("com.android.application")
  id("org.jetbrains.kotlin.android")
  id("org.jetbrains.kotlin.plugin.compose")
  id("com.google.devtools.ksp")
}

configurations.configureEach {
  resolutionStrategy.eachDependency {
    if (requested.group == "org.jetbrains.kotlin" &&
      (requested.name.startsWith("kotlin-stdlib") || requested.name == "kotlin-reflect")
    ) {
      useVersion("1.9.25") // Mantener alineado con la versión de Kotlin
      because("Keep stdlib/reflect aligned with Kotlin 1.9.25 compiler")
    }
  }
}

android {
  namespace = "com.zero.wearsync"
  compileSdk = 36 // Actualizado a 36

  defaultConfig {
    applicationId = "com.zero.wearsync"
    minSdk = 28
    targetSdk = 36 // Actualizado a 36
    versionCode = 1
    versionName = "1.0.0"
    testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
  }

  buildTypes {
    release {
      isMinifyEnabled = true
      isShrinkResources = true
      proguardFiles(
        getDefaultProguardFile("proguard-android-optimize.txt"),
        "proguard-rules.pro"
      )
    }
    debug {
      isMinifyEnabled = false
    }
  }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }

  kotlin {
    compilerOptions {
      jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
  }

  buildFeatures {
    compose = true
  }

  packaging {
    resources {
      excludes += "/META-INF/{AL2.0,LGPL2.1}"
      excludes += "META-INF/versions/9/OSGI-INF/MANIFEST.MF"
    }
  }
}

dependencies {
  implementation("org.jetbrains.kotlin:kotlin-stdlib:2.2.0")
  implementation("org.jetbrains.kotlin:kotlin-reflect:2.2.0")

  val composeBom = platform("androidx.compose:compose-bom:2024.10.01")
  implementation(composeBom)
  androidTestImplementation(composeBom)

  implementation("androidx.core:core-ktx:1.18.0")
  implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.10.0")
  implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.10.0")
  implementation("androidx.activity:activity-compose:1.13.0")
  implementation("androidx.compose.ui:ui")
  implementation("androidx.compose.ui:ui-tooling-preview")
  implementation("androidx.compose.material3:material3:1.4.0")

  implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.11.0")

  implementation("androidx.work:work-runtime-ktx:2.11.2")

  implementation("androidx.room:room-runtime:2.8.4")
  implementation("androidx.room:room-ktx:2.8.4")
  ksp("androidx.room:room-compiler:2.8.4")

  implementation("com.squareup.retrofit2:retrofit:3.0.0")
  implementation("com.squareup.retrofit2:converter-gson:3.0.0")
  implementation("com.squareup.okhttp3:okhttp:5.3.2")
  implementation("com.squareup.okhttp3:logging-interceptor:5.3.2")

  implementation("androidx.health.connect:connect-client:1.1.0")

  implementation("androidx.security:security-crypto:1.1.0")

  implementation("androidx.datastore:datastore-preferences:1.2.1")

  testImplementation("junit:junit:4.13.2")
  androidTestImplementation("androidx.test.ext:junit:1.3.0")
  androidTestImplementation("androidx.test.espresso:espresso-core:3.7.0")
  androidTestImplementation("androidx.compose.ui:ui-test-junit4")
  debugImplementation("androidx.compose.ui:ui-tooling")
  debugImplementation("androidx.compose.ui:ui-test-manifest")
}
