import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Linking } from "react-native";
import { Star, Zap, Shield, Crown, Check } from "lucide-react-native";
import colors from "@/constants/colors";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { PurchasesPackage } from "react-native-purchases";

interface PaywallProps {
  onDismiss?: () => void;
  title?: string;
  subtitle?: string;
}

export function Paywall({ onDismiss, title = "Unlock Pro Access", subtitle = "Take your game to the next level" }: PaywallProps) {
  const { buySubscription, restorePurchases, isPro, currentOffering, isLoading } = useSubscription();
  const [isPurchasing, setIsPurchasing] = React.useState(false);
  const [selectedPackage, setSelectedPackage] = React.useState<PurchasesPackage | null>(null);
  const [isRestoring, setIsRestoring] = React.useState(false);

  const packages = React.useMemo(() => currentOffering?.availablePackages || [], [currentOffering]);
  
  React.useEffect(() => {
    if (packages.length > 0 && !selectedPackage) {
      const monthly = currentOffering?.monthly;
      setSelectedPackage(monthly || packages[0]);
    }
  }, [packages, currentOffering, selectedPackage]);

  const handlePurchase = async () => {
    if (!selectedPackage) return;
    setIsPurchasing(true);
    const success = await buySubscription(selectedPackage);
    setIsPurchasing(false);
    if (success && onDismiss) {
      setTimeout(() => onDismiss(), 500);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    await restorePurchases();
    setIsRestoring(false);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.palette.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (isPro) {
    return (
      <View style={styles.container}>
        <View style={styles.successContent}>
          <View style={styles.successBadge}>
            <Crown size={64} color={colors.palette.primary} fill={colors.palette.primary} fillOpacity={0.2} />
          </View>
          <Text style={styles.successTitle}>You&apos;re a Pro Member!</Text>
          <Text style={styles.successText}>Thank you for supporting the app. You have unlimited access to all features.</Text>
          {onDismiss && (
            <TouchableOpacity style={styles.doneButton} onPress={onDismiss}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          )}
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
          icon={<Zap size={20} color={colors.palette.primary} />}
          text="Unlimited Sessions"
          description="Record as many shooting sessions as you want"
        />
        <FeatureRow 
          icon={<Star size={20} color={colors.palette.primary} />}
          text="Save History"
          description="Track your progress over time"
        />
        <FeatureRow 
          icon={<Shield size={20} color={colors.palette.primary} />}
          text="Print PDF Stats"
          description="Export and share your performance data"
        />
      </View>

      {packages.length > 0 && (
        <View style={styles.packagesContainer}>
          {packages.map((pkg) => {
            const isSelected = selectedPackage?.identifier === pkg.identifier;
            const isAnnual = pkg.packageType === 'ANNUAL';
            const monthlyPrice = isAnnual && pkg.product.price
              ? (pkg.product.price / 12).toFixed(2)
              : null;
            
            return (
              <TouchableOpacity
                key={pkg.identifier}
                style={[styles.packageCard, isSelected && styles.packageCardSelected]}
                onPress={() => setSelectedPackage(pkg)}
                activeOpacity={0.8}
              >
                {isAnnual && (
                  <View style={styles.saveBadge}>
                    <Text style={styles.saveBadgeText}>BEST VALUE</Text>
                  </View>
                )}
                <View style={styles.checkmarkContainer}>
                  {isSelected && (
                    <View style={styles.checkmark}>
                      <Check size={16} color="#fff" strokeWidth={3} />
                    </View>
                  )}
                </View>
                <Text style={styles.packageName}>
                  {pkg.packageType === 'MONTHLY' ? 'Monthly' : 'Annual'}
                </Text>
                <View style={styles.packagePriceRow}>
                  <Text style={styles.packagePrice}>{pkg.product.priceString}</Text>
                  {isAnnual && monthlyPrice && (
                    <Text style={styles.packagePeriod}>({pkg.product.currencyCode} {monthlyPrice}/mo)</Text>
                  )}
                </View>
                <Text style={styles.packageDescription}>
                  {isAnnual ? 'Billed annually' : 'Billed monthly'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {packages.length === 0 && (
        <View style={styles.pricingCard}>
          <Text style={styles.planName}>Monthly Pro</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>$4.99</Text>
            <Text style={styles.period}>/mo</Text>
          </View>
          <Text style={styles.cancelText}>Loading subscription options...</Text>
        </View>
      )}

      <TouchableOpacity 
        style={[styles.subscribeButton, (isPurchasing || !selectedPackage) && styles.buttonDisabled]} 
        onPress={handlePurchase}
        disabled={isPurchasing || !selectedPackage}
        activeOpacity={0.8}
      >
        {isPurchasing ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.subscribeButtonText}>Start Free Trial</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        onPress={handleRestore} 
        style={styles.restoreButton}
        disabled={isRestoring}
      >
        <Text style={styles.restoreButtonText}>
          {isRestoring ? "Restoring..." : "Restore Purchases"}
        </Text>
      </TouchableOpacity>

      <View style={styles.disclaimerContainer}>
        <Text style={styles.disclaimer}>
          Payment will be charged to your Apple ID account at confirmation of purchase. Subscription automatically renews unless canceled at least 24 hours before the end of the current period. Manage your subscription in App Store settings.
        </Text>
      </View>

      <View style={styles.linksContainer}>
        <TouchableOpacity onPress={() => Linking.openURL("https://www.practiceprovolleyball.com/terms.html")}>
          <Text style={styles.linkText}>Terms of Service</Text>
        </TouchableOpacity>
        <Text style={styles.linkSeparator}>•</Text>
        <TouchableOpacity onPress={() => Linking.openURL("https://www.practiceprovolleyball.com/privacy.html")}>
          <Text style={styles.linkText}>Privacy Policy</Text>
        </TouchableOpacity>
        <Text style={styles.linkSeparator}>•</Text>
        <TouchableOpacity onPress={() => Linking.openURL("https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")}>
          <Text style={styles.linkText}>EULA</Text>
        </TouchableOpacity>
      </View>
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
      <Check size={20} color={colors.palette.primary} strokeWidth={2.5} />
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
  loadingText: {
    fontSize: 16,
    color: colors.palette.mutedText,
    marginTop: 16,
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
    marginBottom: 28,
    gap: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.palette.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.palette.border,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(45, 155, 150, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.palette.text,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 12,
    color: colors.palette.mutedText,
    lineHeight: 16,
  },
  packagesContainer: {
    width: "100%",
    gap: 12,
    marginBottom: 24,
  },
  packageCard: {
    backgroundColor: colors.palette.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: colors.palette.border,
    position: "relative" as const,
  },
  packageCardSelected: {
    borderColor: colors.palette.primary,
    backgroundColor: "rgba(45, 155, 150, 0.05)",
  },
  saveBadge: {
    position: "absolute" as const,
    top: -10,
    right: 16,
    backgroundColor: colors.palette.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: "#fff",
    letterSpacing: 0.5,
  },
  checkmarkContainer: {
    position: "absolute" as const,
    top: 18,
    right: 18,
    width: 24,
    height: 24,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.palette.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  packageName: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.palette.text,
    marginBottom: 6,
  },
  packagePriceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  packagePrice: {
    fontSize: 32,
    fontWeight: "800" as const,
    color: colors.palette.text,
  },
  packagePeriod: {
    fontSize: 14,
    color: colors.palette.mutedText,
    marginTop: 8,
  },
  packageDescription: {
    fontSize: 13,
    color: colors.palette.mutedText,
  },
  pricingCard: {
    width: "100%",
    backgroundColor: colors.palette.surface,
    borderRadius: 20,
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
    fontSize: 48,
    fontWeight: "800" as const,
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
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: colors.palette.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    minHeight: 56,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  subscribeButtonText: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#fff",
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
  disclaimerContainer: {
    paddingTop: 8,
  },
  disclaimer: {
    fontSize: 10,
    color: colors.palette.mutedText,
    textAlign: "center",
    lineHeight: 14,
    opacity: 0.5,
  },
  linksContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  linkText: {
    fontSize: 11,
    color: colors.palette.primary,
    fontWeight: "600",
  },
  linkSeparator: {
    fontSize: 11,
    color: colors.palette.mutedText,
    opacity: 0.5,
  },
  successContent: {
    alignItems: "center",
    padding: 40,
    maxWidth: 320,
  },
  successBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(45, 155, 150, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 2,
    borderColor: colors.palette.primary,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: colors.palette.text,
    marginBottom: 12,
    textAlign: "center",
  },
  successText: {
    fontSize: 16,
    color: colors.palette.mutedText,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  doneButton: {
    backgroundColor: colors.palette.primary,
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 12,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#fff",
  },
});
