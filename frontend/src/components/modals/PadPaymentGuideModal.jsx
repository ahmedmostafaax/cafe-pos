import { useState } from "react";
import { getAssetUrl } from "../LazyImage";

export default function PadPaymentGuideModal({ paymentHint, settings, onReportOnly, onDismiss }) {
  const [chosen, setChosen] = useState(null);
  if (!paymentHint) return null;
  const choose = (method) => { setChosen(method); onReportOnly?.(method); };
  return (
    <div className="tp-mo">
      <div className="tp-mo-bg" />
      <div className="tp-mo-content tp-pay-modal">
        <div className="tp-mo-title">订单提交成功</div>
        <div className="tp-pay-total">待支付金额: <b>¥{paymentHint.total}</b></div>

        {!chosen && (
          <div className="tp-pay-actions">
            <button className="tp-pay-btn wechat" onClick={() => choose('wechat')}>我选择微信支付</button>
            <button className="tp-pay-btn alipay" onClick={() => choose('alipay')}>我选择支付宝支付</button>
            <button className="tp-pay-btn cash" onClick={() => choose('cash')}>我选择现金支付</button>
          </div>
        )}

        {chosen === 'wechat' && (
          <>
            <div className="tp-pay-qrs">
              <div className="tp-pay-qr-box">
                <div className="tp-pay-qr-title">微信支付</div>
                {settings?.wechatPayQr
                  ? <img src={getAssetUrl(settings.wechatPayQr)} alt="WeChat" />
                  : <div className="tp-pay-qr-empty">暂无收款码</div>}
              </div>
            </div>
            <div className="tp-pay-actions">
              <button className="tp-pay-btn wechat" onClick={onDismiss}>支付完成</button>
            </div>
          </>
        )}

        {chosen === 'alipay' && (
          <>
            <div className="tp-pay-qrs">
              <div className="tp-pay-qr-box">
                <div className="tp-pay-qr-title">支付宝支付</div>
                {settings?.alipayQr
                  ? <img src={getAssetUrl(settings.alipayQr)} alt="Alipay" />
                  : <div className="tp-pay-qr-empty">暂无收款码</div>}
              </div>
            </div>
            <div className="tp-pay-actions">
              <button className="tp-pay-btn alipay" onClick={onDismiss}>支付完成</button>
            </div>
          </>
        )}

        {chosen === 'cash' && (
          <>
            <div className="tp-pay-text">请收取顾客现金后点确认</div>
            <div className="tp-pay-actions">
              <button className="tp-pay-btn cash" onClick={onDismiss}>好的</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
