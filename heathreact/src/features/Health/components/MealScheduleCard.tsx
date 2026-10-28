import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Image, Linking, Pressable, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AppButton from '@/components/ui/AppButton';
import Card from '@/components/ui/Card';
import { ApiError } from '@/api/client';
import { MealAnalysisLog, MealRecommendation, MealType, nutritionService } from '@/api/services/nutrition.service';
import { palette } from '@/theme/tokens';

const mealOptions: { key: MealType; label: string }[] = [
  { key: 'BREAKFAST', label: 'Sáng' }, { key: 'LUNCH', label: 'Trưa' }, { key: 'DINNER', label: 'Tối' },
];

function sourceLabel(source: MealRecommendation['source'] | MealAnalysisLog['analysis']['source']) {
  if (source === 'KNOWLEDGE_BASE') return 'Có tài liệu Knowledge Base được AI trích dẫn';
  if (source === 'INSUFFICIENT_DATA') return 'Chưa đủ dữ liệu để kết luận';
  return 'Gợi ý chung từ AI, không có tài liệu phù hợp được truy xuất';
}

function fitLabel(status: MealAnalysisLog['analysis']['fitStatus']) {
  if (status === 'FIT') return 'Phù hợp';
  if (status === 'ADJUST') return 'Cần điều chỉnh';
  return 'Chưa đủ dữ liệu';
}

function KnowledgeSources({ sources }: { sources: { title: string; url: string | null }[] }) {
  if (!sources.length) return null;
  return <View style={{ marginTop: 7 }}>
    <Text style={{ color: palette.primary, fontSize: 10, fontWeight: '700' }}>Nguồn Knowledge Base</Text>
    {sources.map((source) => <Pressable key={`${source.title}-${source.url ?? ''}`} disabled={!source.url?.startsWith('https://')} onPress={() => { if (source.url?.startsWith('https://')) void Linking.openURL(source.url).catch(() => {}); }} accessibilityRole={source.url?.startsWith('https://') ? 'link' : undefined} style={{ paddingTop: 4 }}><Text style={{ color: source.url?.startsWith('https://') ? palette.primary : palette.textMuted, fontSize: 10, lineHeight: 15 }}>{source.title}</Text></Pressable>)}
  </View>;
}

export interface MealScheduleCardProps {
  roadmapId: number;
  date: string;
  dayIndex: number;
  onContinue: (mealType: MealType) => Promise<void>;
}

export default function MealScheduleCard({ roadmapId, date, dayIndex, onContinue }: MealScheduleCardProps) {
  const [mealType, setMealType] = useState<MealType>('BREAKFAST');
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [dishName, setDishName] = useState('');
  const [portionNotes, setPortionNotes] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [editingInfo, setEditingInfo] = useState(false);
  const [analysisLog, setAnalysisLog] = useState<MealAnalysisLog | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const recommendationQuery = useQuery({
    queryKey: ['nutrition', 'recommendation', roadmapId, date, mealType],
    queryFn: () => nutritionService.recommendation(date, mealType, roadmapId),
  });
  const recommendation = recommendationQuery.data as MealRecommendation | undefined;

  const switchMealType = async (nextMealType: MealType) => {
    if (nextMealType === mealType || busy) return;
    setMessage('');
    try {
      if (analysisLog?.meal.status === 'ANALYZED') await nutritionService.discard(analysisLog.meal.id);
      setMealType(nextMealType);
      setAnalysisLog(null);
      setAsset(null);
      setDishName('');
      setPortionNotes('');
      setIngredients('');
      setEditingInfo(false);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'Không thể hủy kết quả đang chờ xem.');
    }
  };

  const pickImage = async (useCamera: boolean) => {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) { setMessage('Cần cấp quyền camera để chụp ảnh món ăn.'); return; }
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.82 });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.82 });
      }
      const selected = !result.canceled ? result.assets?.[0] : undefined;
      if (!selected) return;
      if (analysisLog?.meal.status === 'ANALYZED') await nutritionService.discard(analysisLog.meal.id);
      setAsset(selected);
      setAnalysisLog(null);
      setMessage('');
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'Không thể mở camera hoặc thư viện ảnh.');
    }
  };

  const analyze = async () => {
    if (!asset) { setMessage('Chọn hoặc chụp ảnh món ăn trước.'); return; }
    setBusy(true);
    setMessage('');
    try {
      const previous = analysisLog;
      const result = await nutritionService.analyze(asset, {
        mealType, mealDate: date, roadmapId, planDayIndex: dayIndex,
        plannedMeal: recommendation?.suggestedMeal,
        dishName: dishName.trim() || undefined,
        portionNotes: portionNotes.trim() || undefined,
        ingredients: ingredients.trim() || undefined,
      });
      setAnalysisLog(result);
      setEditingInfo(false);
      if (previous?.meal.status === 'ANALYZED') {
        try { await nutritionService.discard(previous.meal.id); }
        catch { setMessage('Kết quả mới đã lưu, nhưng chưa thể dọn bản phân tích xem trước trước đó.'); }
      }
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'Không thể phân tích ảnh bữa ăn.');
    } finally {
      setBusy(false);
    }
  };

  const discardAnalysis = async () => {
    if (!analysisLog) return;
    setBusy(true);
    setMessage('');
    try {
      await nutritionService.discard(analysisLog.meal.id);
      setAnalysisLog(null);
      setAsset(null);
      setEditingInfo(false);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'Không thể hủy kết quả phân tích.');
    } finally {
      setBusy(false);
    }
  };

  const continueAfterAnalysis = async () => {
    if (!analysisLog) return;
    setBusy(true);
    setMessage('');
    try {
      await nutritionService.markReviewed(analysisLog.meal.id);
      await onContinue(mealType);
      setAnalysisLog(null);
      setAsset(null);
      setDishName('');
      setPortionNotes('');
      setIngredients('');
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'Không thể lưu kết quả hoặc chuyển hoạt động.');
    } finally {
      setBusy(false);
    }
  };

  const continueWithoutPhoto = async () => {
    setBusy(true);
    setMessage('');
    try { await onContinue(mealType); }
    catch (error) { setMessage(error instanceof ApiError ? error.message : 'Không thể chuyển hoạt động tiếp theo.'); }
    finally { setBusy(false); }
  };

  return <Card>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
      <Ionicons name="restaurant-outline" size={20} color={palette.primary} />
      <Text style={{ flex: 1, color: palette.text, fontSize: 16, fontWeight: '800' }}>Bữa ăn theo lịch</Text>
    </View>
    <Text style={{ color: palette.textMuted, fontSize: 11, lineHeight: 17, marginTop: 5 }}>Xem gợi ý trước bữa. Bạn có thể bỏ qua ảnh và vẫn tiếp tục lịch tập.</Text>
    <View style={{ flexDirection: 'row', gap: 7, marginTop: 12 }}>
      {mealOptions.map((option) => <Pressable key={option.key} onPress={() => void switchMealType(option.key)} disabled={busy} accessibilityRole="radio" accessibilityState={{ selected: mealType === option.key }} style={{ flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 7, borderWidth: 1, borderColor: mealType === option.key ? palette.primary : palette.border, backgroundColor: mealType === option.key ? palette.primarySoft : 'transparent', opacity: busy ? 0.5 : 1 }}><Text style={{ color: mealType === option.key ? palette.primary : palette.textMuted, fontSize: 11, fontWeight: '800' }}>{option.label}</Text></Pressable>)}
    </View>
    {recommendationQuery.isPending ? <Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 12 }}>Đang lấy gợi ý theo hồ sơ và lịch tập...</Text> : null}
    {recommendationQuery.isError ? <Text style={{ color: palette.warning, fontSize: 11, marginTop: 10 }}>Không tải được lời khuyên trước bữa ăn.</Text> : null}
    {recommendation ? <View style={{ padding: 11, marginTop: 11, borderRadius: 8, backgroundColor: palette.surfaceRaised }}>
      <Text style={{ color: palette.text, fontWeight: '800', fontSize: 12 }}>{recommendation.suggestedMeal}</Text>
      {recommendation.nutritionTargetAvailable ? <Text style={{ color: palette.primary, fontSize: 10, lineHeight: 15, marginTop: 6 }}>Mục tiêu dinh dưỡng từ tài liệu: {recommendation.nutritionTarget}</Text> : null}
      {recommendation.prioritizeFoods.length ? <Text style={{ color: palette.textMuted, fontSize: 10, lineHeight: 15, marginTop: 6 }}>Ưu tiên: {recommendation.prioritizeFoods.join(', ')}</Text> : null}
      {recommendation.limitFoods.length ? <Text style={{ color: palette.textMuted, fontSize: 10, lineHeight: 15, marginTop: 4 }}>Hạn chế: {recommendation.limitFoods.join(', ')}</Text> : null}
      {recommendation.reasons.map((reason) => <Text key={reason} style={{ color: palette.textMuted, fontSize: 10, lineHeight: 15, marginTop: 5 }}>• {reason}</Text>)}
      {recommendation.knowledgeSources.length ? <KnowledgeSources sources={recommendation.knowledgeSources} /> : <Text style={{ color: palette.textMuted, fontSize: 10, lineHeight: 15, marginTop: 7 }}>{sourceLabel(recommendation.source)}</Text>}
      {recommendation.limitationNote ? <Text style={{ color: palette.warning, fontSize: 10, lineHeight: 15, marginTop: 5 }}>{recommendation.limitationNote}</Text> : null}
    </View> : null}

    {!analysisLog ? <>
      {asset ? <Image source={{ uri: asset.uri }} accessibilityLabel="Ảnh món ăn xem trước" resizeMode="cover" style={{ width: '100%', height: 190, marginTop: 12, borderRadius: 8 }} /> : null}
      {asset ? <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <Pressable onPress={() => void pickImage(true)} disabled={busy} accessibilityRole="button" style={{ flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.border, borderRadius: 7 }}><Text style={{ color: palette.text, fontSize: 10, fontWeight: '700' }}>Chụp lại</Text></Pressable>
        <Pressable onPress={() => { setAsset(null); setMessage(''); }} disabled={busy} accessibilityRole="button" style={{ flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.border, borderRadius: 7 }}><Text style={{ color: palette.textMuted, fontSize: 10, fontWeight: '700' }}>Hủy ảnh</Text></Pressable>
      </View> : <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <Pressable onPress={() => void pickImage(true)} disabled={busy} accessibilityRole="button" style={{ flex: 1, minHeight: 40, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.border, borderRadius: 7 }}><Ionicons name="camera-outline" size={16} color={palette.primary} /><Text style={{ color: palette.text, fontSize: 10, fontWeight: '700' }}>Chụp ảnh</Text></Pressable>
        <Pressable onPress={() => void pickImage(false)} disabled={busy} accessibilityRole="button" style={{ flex: 1, minHeight: 40, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.border, borderRadius: 7 }}><Ionicons name="image-outline" size={16} color={palette.primary} /><Text style={{ color: palette.text, fontSize: 10, fontWeight: '700' }}>Thư viện</Text></Pressable>
      </View>}
      {asset && editingInfo ? <View style={{ gap: 7, marginTop: 10 }}>
        <TextInput value={dishName} onChangeText={setDishName} placeholder="Tên món nếu bạn biết" placeholderTextColor={palette.textMuted} maxLength={180} style={{ minHeight: 38, paddingHorizontal: 9, color: palette.text, backgroundColor: palette.surfaceRaised, borderRadius: 6, fontSize: 11 }} />
        <TextInput value={portionNotes} onChangeText={setPortionNotes} placeholder="Khẩu phần ước lượng (ví dụ: 1 bát)" placeholderTextColor={palette.textMuted} maxLength={500} style={{ minHeight: 38, paddingHorizontal: 9, color: palette.text, backgroundColor: palette.surfaceRaised, borderRadius: 6, fontSize: 11 }} />
        <TextInput value={ingredients} onChangeText={setIngredients} placeholder="Nguyên liệu bạn biết (không bắt buộc)" placeholderTextColor={palette.textMuted} maxLength={500} style={{ minHeight: 38, paddingHorizontal: 9, color: palette.text, backgroundColor: palette.surfaceRaised, borderRadius: 6, fontSize: 11 }} />
      </View> : null}
      {asset ? <>
        <Pressable onPress={() => setEditingInfo((value) => !value)} accessibilityRole="button" style={{ paddingVertical: 8 }}><Text style={{ color: palette.primary, fontSize: 11, fontWeight: '700' }}>{editingInfo ? 'Ẩn thông tin món ăn' : 'Thêm tên món, khẩu phần hoặc nguyên liệu'}</Text></Pressable>
        <AppButton label="Phân tích ảnh món ăn" onPress={() => void analyze()} loading={busy} disabled={busy} />
      </> : <AppButton label="Tiếp tục không chụp ảnh" variant="secondary" onPress={() => void continueWithoutPhoto()} loading={busy} disabled={busy} />}
    </> : <View style={{ marginTop: 12 }}>
      <Image source={{ uri: asset?.uri ?? analysisLog.meal.photoUrl ?? undefined }} accessibilityLabel="Ảnh món ăn đã phân tích" resizeMode="cover" style={{ width: '100%', height: 190, borderRadius: 8 }} />
      <Text style={{ color: palette.primary, fontSize: 14, fontWeight: '800', marginTop: 11 }}>{fitLabel(analysisLog.analysis.fitStatus)}</Text>
      <Text style={{ color: palette.textMuted, fontSize: 10, marginTop: 4 }}>Độ tin cậy nhận diện: {analysisLog.analysis.confidence}</Text>
      {analysisLog.analysis.identifiedFoods.map((food, index) => <Text key={`${food.name}-${index}`} style={{ color: palette.text, fontSize: 11, lineHeight: 17, marginTop: 6 }}>{food.name} · {food.confidence}{food.portionEstimate ? ` · ${food.portionEstimate}` : ''}</Text>)}
      <Text style={{ color: palette.text, fontSize: 11, lineHeight: 17, marginTop: 8 }}>{analysisLog.analysis.summary}</Text>
      {analysisLog.analysis.nutritionEstimate.available ? <Text style={{ color: palette.primary, fontSize: 10, lineHeight: 15, marginTop: 8 }}>Ước tính: {analysisLog.analysis.nutritionEstimate.caloriesMin}–{analysisLog.analysis.nutritionEstimate.caloriesMax} kcal · đạm {analysisLog.analysis.nutritionEstimate.proteinMinG}–{analysisLog.analysis.nutritionEstimate.proteinMaxG} g · carb {analysisLog.analysis.nutritionEstimate.carbohydratesMinG}–{analysisLog.analysis.nutritionEstimate.carbohydratesMaxG} g · béo {analysisLog.analysis.nutritionEstimate.fatMinG}–{analysisLog.analysis.nutritionEstimate.fatMaxG} g</Text> : <Text style={{ color: palette.textMuted, fontSize: 10, lineHeight: 15, marginTop: 8 }}>Chưa đủ cơ sở để ước tính calories và macros.</Text>}
      {analysisLog.analysis.nutritionEstimate.uncertainty ? <Text style={{ color: palette.warning, fontSize: 10, lineHeight: 15, marginTop: 4 }}>{analysisLog.analysis.nutritionEstimate.uncertainty}</Text> : null}
      {analysisLog.analysis.positiveAspects.map((item) => <Text key={`good-${item}`} style={{ color: palette.textMuted, fontSize: 10, lineHeight: 15, marginTop: 5 }}>Tốt: {item}</Text>)}
      {analysisLog.analysis.concerns.map((item) => <Text key={`concern-${item}`} style={{ color: palette.textMuted, fontSize: 10, lineHeight: 15, marginTop: 5 }}>Cân nhắc: {item}</Text>)}
      {analysisLog.analysis.suggestions.map((item) => <Text key={`suggestion-${item}`} style={{ color: palette.text, fontSize: 10, lineHeight: 15, marginTop: 5 }}>Gợi ý: {item}</Text>)}
      {analysisLog.analysis.knowledgeSources.length ? <KnowledgeSources sources={analysisLog.analysis.knowledgeSources} /> : <Text style={{ color: palette.textMuted, fontSize: 10, lineHeight: 15, marginTop: 8 }}>{sourceLabel(analysisLog.analysis.source)}</Text>}
      <Text style={{ color: palette.warning, fontSize: 10, lineHeight: 15, marginTop: 6 }}>Ảnh không xác định chính xác nguyên liệu hay khẩu phần; đây không phải chẩn đoán y khoa.</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <Pressable onPress={() => setEditingInfo((value) => !value)} disabled={busy} accessibilityRole="button" style={{ flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.border, borderRadius: 7 }}><Text style={{ color: palette.primary, fontSize: 10, fontWeight: '700' }}>Chỉnh sửa thông tin món ăn</Text></Pressable>
        <Pressable onPress={() => void pickImage(true)} disabled={busy} accessibilityRole="button" style={{ minHeight: 38, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.border, borderRadius: 7 }}><Text style={{ color: palette.text, fontSize: 10, fontWeight: '700' }}>Chụp lại</Text></Pressable>
        <Pressable onPress={() => void discardAnalysis()} disabled={busy} accessibilityRole="button" accessibilityLabel="Hủy kết quả và xóa ảnh" style={{ width: 38, minHeight: 38, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="trash-outline" size={18} color={palette.danger} /></Pressable>
      </View>
      {editingInfo ? <View style={{ gap: 7, marginTop: 9 }}>
        <TextInput value={dishName} onChangeText={setDishName} placeholder="Tên món" maxLength={180} placeholderTextColor={palette.textMuted} style={{ minHeight: 38, paddingHorizontal: 9, color: palette.text, backgroundColor: palette.surfaceRaised, borderRadius: 6, fontSize: 11 }} />
        <TextInput value={portionNotes} onChangeText={setPortionNotes} placeholder="Khẩu phần" maxLength={500} placeholderTextColor={palette.textMuted} style={{ minHeight: 38, paddingHorizontal: 9, color: palette.text, backgroundColor: palette.surfaceRaised, borderRadius: 6, fontSize: 11 }} />
        <TextInput value={ingredients} onChangeText={setIngredients} placeholder="Nguyên liệu" maxLength={500} placeholderTextColor={palette.textMuted} style={{ minHeight: 38, paddingHorizontal: 9, color: palette.text, backgroundColor: palette.surfaceRaised, borderRadius: 6, fontSize: 11 }} />
        <AppButton label="Phân tích lại" variant="secondary" onPress={() => void analyze()} loading={busy} disabled={busy} />
      </View> : null}
      <View style={{ marginTop: 10 }}><AppButton label="Tiếp tục" onPress={() => void continueAfterAnalysis()} loading={busy} disabled={busy} /></View>
    </View>}
    {message ? <Text accessibilityLiveRegion="polite" style={{ color: palette.warning, fontSize: 11, lineHeight: 16, marginTop: 8 }}>{message}</Text> : null}
  </Card>;
}
