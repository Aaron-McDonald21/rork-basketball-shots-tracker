import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Star, Zap, Shield, Crown } from "lucide-react-native";
import colors from "@/constants/colors";
import { useSubscription } from "@/contexts/SubscriptionContext";

interface PaywallProps {
  onDismiss?: () => void; // If used in a modal
  title?: string;
  subtitle?: string;
}

export function Paywall({ onDismiss, title = "Unlock Pro Access", subtitle = "Take your game to the next level" }: PaywallProps) {
  const { buySubscription, restorePurchases, isPro, currentOffering } = useSubscription();
  const [isPurchasing, setIsPurchasing] = React.useState(false);

  // Get the package to display
  const pkg = currentOffering?.monthly || currentOffering?.availablePackages?.[0];
  const priceString = pkg?.product.priceString || "$4.99";

  const handlePurchase = async () => {
    setIsPurchasing(true);
    await buySubscription(pkg);
    setIsPurchasing(false);
  };

  if (isPro) {
    return (
      <View style={styles.container}>
        <View style={styles.successContent}>
          <Crown size={64} color={colors.palette.primary} />
          <Text style={styles.successTitle}>You are a Pro Member!</Text>
          <Text style={styles.successText}>Thank you for supporting the app. You have unlimited access to all features.</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Crown size={48} color={colors.palette.primary} fill={colors.palette.primary} fillOpacity={0.2} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <View style={styles.featuresContainer}>
        <FeatureRow 
          icon={<Zap size={24} color={colors.palette.primary} />}
          text="Unlimited Sessions"
          description="Record as many shooting sessions as you want."
        />
        <FeatureRow 
          icon={<Star size={24} color={colors.palette.primary} />}
          text="Save History"
          description="Track your progress over time. Free sessions are not saved."
        />
        <FeatureRow 
          icon={<Shield size={24} color={colors.palette.primary} />}
          text="Advanced Stats"
          description="Deep dive into your shooting performance and analytics."
        />
      </View>

      <View style={styles.pricingCard}>
        <Text style={styles.planName}>Monthly Pro</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{priceString}</Text>
          <Text style={styles.period}>/mo</Text>
        </View>
        <Text style={styles.cancelText}>Cancel anytime. No commitment.</Text>
      </View>

      <TouchableOpacity 
        style={[styles.subscribeButton, isPurchasing && styles.buttonDisabled]} 
        onPress={handlePurchase}
        disabled={isPurchasing}
      >
        <Text style={styles.subscribeButtonText}>
          {isPurchasing ? "Processing..." : "Subscribe Now"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={restorePurchases} style={styles.restoreButton}>
        <Text style={styles.restoreButtonText}>Restore Purchases</Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        Payment will be charged to your account at confirmation of purchase. Subscription automatically renews unless auto-renew is turned off at least 24-hours before the end of the current period.
      </Text>
    </ScrollView>
  );
}

function FeatureRow({ icon, text, description }: { icon: React.ReactNode; text: string; description: string }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIcon}>
        {icon}
      </View>
      <View style={styles.featureTextContainer}>
        <Text style={styles.featureTitle}>{text}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.palette.background,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.palette.background,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
    marginTop: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.palette.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.palette.border,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.palette.text,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.palette.mutedText,
    textAlign: "center",
  },
  featuresContainer: {
    width: "100%",
    marginBottom: 32,
    gap: 20,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.palette.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.palette.border,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(45, 155, 150, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.palette.text,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 13,
    color: colors.palette.mutedText,
    lineHeight: 18,
  },
  pricingCard: {
    width: "100%",
    backgroundColor: colors.palette.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 2,
    borderColor: colors.palette.primary,
  },
  planName: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.palette.primary,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  currency: {
    fontSize: 24,
    fontWeight: "600",
    color: colors.palette.text,
    marginTop: 8,
    marginRight: 4,
  },
  price: {
    fontSize: 56,
    fontWeight: "800",
    color: colors.palette.text,
  },
  period: {
    fontSize: 18,
    color: colors.palette.mutedText,
    marginTop: 34,
    marginLeft: 4,
  },
  cancelText: {
    fontSize: 12,
    color: colors.palette.mutedText,
  },
  subscribeButton: {
    width: "100%",
    backgroundColor: colors.palette.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: colors.palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  subscribeButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.palette.text,
  },
  restoreButton: {
    padding: 12,
    marginBottom: 24,
  },
  restoreButtonText: {
    fontSize: 14,
    color: colors.palette.mutedText,
    fontWeight: "600",
  },
  disclaimer: {
    fontSize: 11,
    color: colors.palette.mutedText,
    textAlign: "center",
    lineHeight: 16,
    opacity: 0.6,
  },
  successContent: {
    alignItems: "center",
    padding: 32,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.palette.text,
    marginTop: 24,
    marginBottom: 12,
    textAlign: "center",
  },
  successText: {
    fontSize: 16,
    color: colors.palette.mutedText,
    textAlign: "center",
    lineHeight: 24,
  },
});
