"""
========================================
Tanabbah Fraud Detection Evaluation Script
========================================
Purpose: Evaluate classification accuracy, red flags detection, and risk score consistency
Author: Manal Alyami
Version: 1.0.0
========================================
"""

import json
import requests
from typing import Dict, List, Any
from collections import defaultdict
import sys

# Configuration
API_BASE_URL = 'https://tanabbah-production-a91f.up.railway.app'  # Change to production URL if needed
ENABLE_LLM = True

# Label to risk score ranges (expected)
RISK_SCORE_RANGES = {
    "SAFE": (0, 30),
    "LOW_RISK": (31, 55),
    "SUSPICIOUS": (56, 75),
    "HIGH_RISK": (76, 100)
}


def load_test_dataset(filepath: str) -> Dict[str, Any]:
    """Load the evaluation dataset from JSON file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"❌ Error: File '{filepath}' not found!")
        sys.exit(1)
    except json.JSONDecodeError:
        print(f"❌ Error: Invalid JSON in '{filepath}'!")
        sys.exit(1)


def analyze_message(message: str, enable_llm: bool = True) -> Dict[str, Any]:
    """
    Call the Tanabbah API to analyze a message
    Returns the analysis result
    """
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/analyze",
            json={
                "message": message,
                "enable_llm": enable_llm
            },
            timeout=30
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"⚠️ API Error {response.status_code}: {response.text}")
            return None
            
    except requests.exceptions.ConnectionError:
        print(f"❌ Error: Cannot connect to API at {API_BASE_URL}")
        print("Make sure the backend is running: python -m backend.main")
        sys.exit(1)
    except requests.exceptions.Timeout:
        print(f"⚠️ API request timed out for message")
        return None
    except Exception as e:
        print(f"⚠️ Unexpected error: {e}")
        return None


def normalize_classification(classification: str) -> str:
    """Normalize classification labels"""
    classification = classification.upper().replace(" ", "_").replace("-", "_")
    
    # Handle variations
    if "LOW" in classification:
        return "LOW_RISK"
    elif "HIGH" in classification:
        return "HIGH_RISK"
    elif "SUSPICIOUS" in classification or "SUSPECT" in classification:
        return "SUSPICIOUS"
    elif "SAFE" in classification:
        return "SAFE"
    else:
        return classification


def check_risk_score_consistency(label: str, risk_score: float) -> bool:
    """Check if risk score is consistent with label"""
    if label not in RISK_SCORE_RANGES:
        return False
    
    min_score, max_score = RISK_SCORE_RANGES[label]
    return min_score <= risk_score <= max_score


def calculate_red_flags_accuracy(expected: List[str], actual: List[str]) -> Dict[str, Any]:
    """
    Calculate red flags detection metrics
    Returns precision, recall, and F1 score
    """
    if not expected and not actual:
        return {"precision": 1.0, "recall": 1.0, "f1": 1.0, "matched": 0, "total_expected": 0}
    
    if not expected:
        return {"precision": 0.0, "recall": 1.0, "f1": 0.0, "matched": 0, "total_expected": 0}
    
    if not actual:
        return {"precision": 1.0, "recall": 0.0, "f1": 0.0, "matched": 0, "total_expected": len(expected)}
    
    # Normalize flags for comparison
    expected_normalized = [flag.lower().strip() for flag in expected]
    actual_normalized = [flag.lower().strip() for flag in actual]
    
    # Count matches (partial matching)
    matched = 0
    for exp_flag in expected_normalized:
        for act_flag in actual_normalized:
            # Check if either contains the other (partial match)
            if exp_flag in act_flag or act_flag in exp_flag:
                matched += 1
                break
    
    # Calculate metrics
    precision = matched / len(actual_normalized) if actual_normalized else 0.0
    recall = matched / len(expected_normalized) if expected_normalized else 0.0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    
    return {
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "matched": matched,
        "total_expected": len(expected_normalized),
        "total_actual": len(actual_normalized)
    }


def run_evaluation(dataset_path: str = "eval_dataset.json", 
                   output_path: str = "eval_results.json") -> Dict[str, Any]:
    """
    Run complete evaluation
    """
    print("=" * 70)
    print("🔍 TANABBAH FRAUD DETECTION EVALUATION")
    print("=" * 70)
    print()
    
    # Load dataset
    print("📂 Loading evaluation dataset...")
    dataset = load_test_dataset(dataset_path)
    test_cases = dataset.get("test_cases", [])
    
    print(f"✅ Loaded {len(test_cases)} test cases")
    print(f"   - SAFE: {dataset['statistics']['safe']}")
    print(f"   - LOW_RISK: {dataset['statistics']['low_risk']}")
    print(f"   - SUSPICIOUS: {dataset['statistics']['suspicious']}")
    print(f"   - HIGH_RISK: {dataset['statistics']['high_risk']}")
    print()
    
    # Check API health
    print("🔗 Checking API connection...")
    try:
        health = requests.get(f"{API_BASE_URL}/health", timeout=5)
        if health.status_code == 200:
            health_data = health.json()
            print(f"✅ API is healthy")
            print(f"   - Model loaded: {health_data.get('model_loaded', False)}")
            print(f"   - LLM enabled: {health_data.get('llm_enabled', False)}")
        else:
            print(f"⚠️ API returned status {health.status_code}")
    except:
        print("❌ Cannot connect to API. Make sure backend is running!")
        sys.exit(1)
    print()
    
    # Run evaluation
    print("🚀 Starting evaluation...")
    print()
    
    results = []
    correct_classifications = 0
    consistent_risk_scores = 0
    red_flags_metrics = []
    
    confusion_matrix = defaultdict(lambda: defaultdict(int))
    
    for i, test_case in enumerate(test_cases, 1):
        test_id = test_case["id"]
        message = test_case["message"]
        expected_label = test_case["label"]
        expected_flags = test_case["expected_red_flags"]
        language = test_case["language"]
        
        print(f"[{i}/{len(test_cases)}] Testing {test_id} ({language})...")
        
        # Analyze message
        analysis = analyze_message(message, ENABLE_LLM)
        
        if analysis is None:
            print(f"   ⚠️ Skipped (API error)")
            results.append({
                "test_id": test_id,
                "message": message,
                "expected_label": expected_label,
                "expected_flags": expected_flags,
                "predicted_label": None,
                "predicted_flags": None,
                "risk_score": None,
                "classification_correct": False,
                "risk_score_consistent": False,
                "error": "API call failed"
            })
            continue
        
        # Extract results
        predicted_label = normalize_classification(analysis.get("classification", "UNKNOWN"))
        predicted_flags = analysis.get("red_flags_ar" if language == "ar" else "red_flags", [])
        risk_score = analysis.get("risk_score", 0)
        
        # Check classification accuracy
        classification_correct = (predicted_label == expected_label)
        if classification_correct:
            correct_classifications += 1
            print(f"   ✅ Classification: {predicted_label} (correct)")
        else:
            print(f"   ❌ Classification: {predicted_label} (expected: {expected_label})")
        
        # Update confusion matrix
        confusion_matrix[expected_label][predicted_label] += 1
        
        # Check risk score consistency
        risk_consistent = check_risk_score_consistency(expected_label, risk_score)
        if risk_consistent:
            consistent_risk_scores += 1
            print(f"   ✅ Risk score: {risk_score}% (consistent with {expected_label})")
        else:
            expected_range = RISK_SCORE_RANGES.get(expected_label, (0, 0))
            print(f"   ⚠️ Risk score: {risk_score}% (expected range: {expected_range[0]}-{expected_range[1]})")
        
        # Check red flags
        flags_metrics = calculate_red_flags_accuracy(expected_flags, predicted_flags)
        red_flags_metrics.append(flags_metrics)
        
        if expected_flags:
            print(f"   📋 Red flags: Precision={flags_metrics['precision']:.2f}, Recall={flags_metrics['recall']:.2f}, F1={flags_metrics['f1']:.2f}")
            print(f"      Expected: {expected_flags}")
            print(f"      Detected: {predicted_flags}")
        
        print()
        
        # Store result
        results.append({
            "test_id": test_id,
            "message": message,
            "language": language,
            "expected_label": expected_label,
            "expected_flags": expected_flags,
            "predicted_label": predicted_label,
            "predicted_flags": predicted_flags,
            "risk_score": risk_score,
            "classification_correct": classification_correct,
            "risk_score_consistent": risk_consistent,
            "flags_metrics": flags_metrics
        })
    
    # Calculate overall metrics
    total_tests = len(test_cases)
    classification_accuracy = correct_classifications / total_tests if total_tests > 0 else 0.0
    risk_score_consistency = consistent_risk_scores / total_tests if total_tests > 0 else 0.0
    
    # Average red flags metrics
    avg_flags_precision = sum(m["precision"] for m in red_flags_metrics) / len(red_flags_metrics) if red_flags_metrics else 0.0
    avg_flags_recall = sum(m["recall"] for m in red_flags_metrics) / len(red_flags_metrics) if red_flags_metrics else 0.0
    avg_flags_f1 = sum(m["f1"] for m in red_flags_metrics) / len(red_flags_metrics) if red_flags_metrics else 0.0
    
    # Print summary
    print("=" * 70)
    print("📊 EVALUATION SUMMARY")
    print("=" * 70)
    print()
    print(f"🎯 Classification Accuracy: {classification_accuracy:.1%} ({correct_classifications}/{total_tests})")
    print(f"📈 Risk Score Consistency: {risk_score_consistency:.1%} ({consistent_risk_scores}/{total_tests})")
    print()
    print(f"🚩 Red Flags Detection:")
    print(f"   - Precision: {avg_flags_precision:.1%}")
    print(f"   - Recall: {avg_flags_recall:.1%}")
    print(f"   - F1 Score: {avg_flags_f1:.1%}")
    print()
    
    # Print confusion matrix
    print("📋 Confusion Matrix:")
    print()
    labels = ["SAFE", "LOW_RISK", "SUSPICIOUS", "HIGH_RISK"]
    
    # Header
    print("Actual \\ Predicted".ljust(20), end="")
    for label in labels:
        print(label.ljust(15), end="")
    print()
    print("-" * 80)
    
    # Rows
    for actual in labels:
        print(actual.ljust(20), end="")
        for predicted in labels:
            count = confusion_matrix[actual][predicted]
            print(str(count).ljust(15), end="")
        print()
    print()
    
    # Per-class metrics
    print("📊 Per-Class Metrics:")
    print()
    for label in labels:
        true_positives = confusion_matrix[label][label]
        false_positives = sum(confusion_matrix[other][label] for other in labels if other != label)
        false_negatives = sum(confusion_matrix[label][other] for other in labels if other != label)
        
        precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0.0
        recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 0.0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        
        print(f"   {label}:")
        print(f"      Precision: {precision:.1%}")
        print(f"      Recall: {recall:.1%}")
        print(f"      F1 Score: {f1:.1%}")
        print()
    
    # Save results
    output_data = {
        "evaluation_summary": {
            "total_tests": total_tests,
            "classification_accuracy": classification_accuracy,
            "correct_classifications": correct_classifications,
            "risk_score_consistency": risk_score_consistency,
            "consistent_risk_scores": consistent_risk_scores,
            "red_flags_metrics": {
                "precision": avg_flags_precision,
                "recall": avg_flags_recall,
                "f1_score": avg_flags_f1
            }
        },
        "confusion_matrix": dict(confusion_matrix),
        "detailed_results": results
    }
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    
    print(f"💾 Results saved to: {output_path}")
    print()
    print("=" * 70)
    
    return output_data


if __name__ == "__main__":
    # Run evaluation
    try:
        results = run_evaluation()
        
        # Exit with appropriate code
        accuracy = results["evaluation_summary"]["classification_accuracy"]
        if accuracy >= 0.8:
            print("✅ Evaluation PASSED (accuracy >= 80%)")
            sys.exit(0)
        else:
            print(f"⚠️ Evaluation needs improvement (accuracy: {accuracy:.1%})")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n\n⚠️ Evaluation interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Evaluation failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)