#!/usr/bin/env python3
"""
Quick validation script to check if benchmark setup is ready
"""

import os
import sys

def check_file(filepath, description):
    """Check if file exists"""
    exists = os.path.exists(filepath)
    status = "✅" if exists else "❌"
    print(f"{status} {description}: {filepath}")
    return exists

def main():
    print("🔍 Checking LBot Benchmark Setup\n")
    print("="*70)
    
    all_ok = True
    
    # Check test set
    print("\n📋 Test Set:")
    all_ok &= check_file("benchmark_test_set.txt", "Test set")
    
    # Check models
    print("\n🤖 Models:")
    all_ok &= check_file("lbot-v5/lbot_translator_v5.pt", "V5 model")
    all_ok &= check_file("lbot-v5.1/lbot_translator_v5-1.pt", "V5.1 model")
    
    # Check scripts
    print("\n📜 Scripts:")
    all_ok &= check_file("benchmark_v5_vs_v5-1.py", "Benchmark script")
    all_ok &= check_file("benchmark_requirements.txt", "Requirements file")
    all_ok &= check_file("BENCHMARK_README.md", "Documentation")
    
    # Check Python dependencies
    print("\n🐍 Python Dependencies:")
    try:
        import torch
        print("✅ torch installed")
    except ImportError:
        print("❌ torch not installed (required)")
        all_ok = False
    
    try:
        import numpy
        print("✅ numpy installed")
    except ImportError:
        print("❌ numpy not installed (required)")
        all_ok = False
    
    try:
        import matplotlib
        print("✅ matplotlib installed (optional)")
    except ImportError:
        print("⚠️  matplotlib not installed (visualizations will be skipped)")
    
    try:
        import seaborn
        print("✅ seaborn installed (optional)")
    except ImportError:
        print("⚠️  seaborn not installed (visualizations will be basic)")
    
    # Summary
    print("\n" + "="*70)
    if all_ok:
        print("\n✅ All required files and dependencies present!")
        print("\nYou can run the benchmark:")
        print("   python benchmark_v5_vs_v5-1.py")
    else:
        print("\n❌ Missing required files or dependencies")
        print("\nPlease:")
        if not os.path.exists("lbot-v5/lbot_translator_v5.pt"):
            print("   1. Train V5 model: lbot-v5/lbot_training_v5.ipynb")
        if not os.path.exists("lbot-v5.1/lbot_translator_v5-1.pt"):
            print("   2. Train V5.1 model: lbot-v5.1/lbot_training_v5-1.ipynb")
        print("   3. Install dependencies: pip install -r benchmark_requirements.txt")
    
    print()
    return 0 if all_ok else 1

if __name__ == "__main__":
    sys.exit(main())
