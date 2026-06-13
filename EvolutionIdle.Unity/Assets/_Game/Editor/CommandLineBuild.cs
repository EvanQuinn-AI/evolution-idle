using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;

namespace EvolutionIdle.Game.Editor
{
    public static class CommandLineBuild
    {
        public static void Build()
        {
            var targetName = Environment.GetEnvironmentVariable("BUILD_TARGET") ?? "StandaloneWindows64";
            if (!Enum.TryParse(targetName, true, out BuildTarget target))
                throw new ArgumentException("Unknown BUILD_TARGET: " + targetName);

            var output = Environment.GetEnvironmentVariable("BUILD_OUTPUT") ?? DefaultOutput(target);
            if (target == BuildTarget.Android) EditorUserBuildSettings.buildAppBundle = true;
            var sceneDirectory = Path.Combine("Library", "GeneratedScenes");
            Directory.CreateDirectory(sceneDirectory);
            var scenePath = Path.Combine(sceneDirectory, "Bootstrap.unity").Replace('\\', '/');
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            EditorSceneManager.SaveScene(scene, scenePath);

            var options = new BuildPlayerOptions
            {
                scenes = new[] { scenePath },
                target = target,
                locationPathName = output,
                options = BuildOptions.CleanBuildCache
            };

            var report = BuildPipeline.BuildPlayer(options);
            if (report.summary.result != BuildResult.Succeeded)
                throw new Exception("Build failed: " + string.Join("; ", report.steps.SelectMany(step => step.messages).Select(message => message.content)));
        }

        private static string DefaultOutput(BuildTarget target)
        {
            return target switch
            {
                BuildTarget.Android => "Build/Android/EvolutionIdle.aab",
                BuildTarget.iOS => "Build/iOS",
                BuildTarget.StandaloneOSX => "Build/macOS/EvolutionIdle.app",
                _ => "Build/Windows/EvolutionIdle.exe"
            };
        }
    }
}
